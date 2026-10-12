import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | undefined;
let serviceClient: SupabaseClient | undefined;

function isNewSupabaseApiKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

function createServerClient(url: string, key: string): SupabaseClient {
  const newKey = isNewSupabaseApiKey(key);

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: async (input, init) => {
        if (!newKey) {
          return fetch(input, init);
        }

        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }

        return fetch(input, { ...init, headers });
      },
    },
  });
}

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
    anonClient = createServerClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_ANON_KEY"),
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
    serviceClient = createServerClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICEROLE_KEY"),
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
    const headers: Record<string, string> = {
      Accept: "application/openapi+json",
      apikey: key,
    };

    // Legacy anon/service_role keys are JWTs. New publishable/secret keys are
    // not JWTs and must not be sent as Authorization bearer tokens.
    if (!isNewSupabaseApiKey(key)) {
      headers.Authorization = `Bearer ${key}`;
    }

    return fetch(endpoint, {
      method: "GET",
      headers,
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
