DB workflow overview

- Source of truth: SQL migrations in `supabase/migrations/*.sql`.
- Local dev: run `supabase start` (Docker) then `supabase db reset` to apply migrations and `supabase/seed.sql`.
- Type generation: `cd frontend && bun run db:types` to generate `src/db/types.supabase.ts` from the local DB.
- Remote sync: `supabase db push` from repo root to apply your migrations to the remote project when ready.

Notes
- Do not edit schema solely in `docs/`; capture changes as migrations under `supabase/migrations/`.
- RLS uses `auth.uid()`; insert rows with the current authenticated user to pass policies.
- Seeds run with elevated privileges during `db reset` and bypass RLS.

