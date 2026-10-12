# Marvel Chatbot

A Marvel-focused chatbot backed by a shared API server. Supabase is available as an additional server-side data connection for apps in this project.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Existing Postgres env: `DATABASE_URL`
- Supabase server secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICEROLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Data: PostgreSQL + Drizzle ORM, with Supabase JS available to shared API routes
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Chat app: `artifacts/marvel-chatbot`
- Shared API server: `artifacts/api-server`
- Supabase server clients and connection check: `artifacts/api-server/src/lib/supabase.ts`
- API contract: `lib/api-spec/openapi.yaml`
- Existing Postgres schema: `lib/db/src/schema`

## Architecture decisions

- Supabase is an additive shared connection; it does not replace or migrate the existing Postgres database.
- Browser code must never receive `SUPABASE_SERVICEROLE_KEY`. Prefer the anon client; service-role operations bypass RLS and require route-level authorization.

## Product

The Marvel chatbot answers fan questions about characters, comics, films, and television. Shared API routes can use Supabase for future app data while existing Postgres-backed code remains unchanged.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Keep all Supabase credentials in the API server environment; do not place them in `VITE_` variables or frontend code.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
