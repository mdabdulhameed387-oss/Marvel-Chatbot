import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | undefined;
let serviceClient: SupabaseClient | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/**
 * Shared least-privilege Supabase client for server routes.
 * Database operations made through this client remain subject to RLS.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_ANON_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  return anonClient;
}

/**
 * Privileged, server-only client. It bypasses RLS; every route using it must
 * enforce its own authorization checks before reading or changing data.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICEROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  return serviceClient;
}

/**
 * Read-only PostgREST root check. It confirms the URL and anon key work
 * without querying application tables or returning schema metadata.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  statusCode: number;
  anonStatusCode: number;
  accessLevel: "anon" | "service_role" | null;
}> {
  const url = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICEROLE_KEY");
  const endpoint = new URL("/rest/v1/", url);

  async function checkKey(key: string): Promise<Response> {
    return fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/openapi+json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(5000),
    });
  }

  const anonResponse = await checkKey(anonKey);
  if (anonResponse.ok) {
    return {
      connected: true,
      statusCode: anonResponse.status,
      anonStatusCode: anonResponse.status,
      accessLevel: "anon",
    };
  }

  const serviceResponse = await checkKey(serviceRoleKey);
  return {
    connected: serviceResponse.ok,
    statusCode: serviceResponse.status,
    anonStatusCode: anonResponse.status,
    accessLevel: serviceResponse.ok ? "service_role" : null,
  };
}
