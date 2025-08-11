vibeResearch monorepo layout

- frontend: Next.js app (App Router, TypeScript)
- supabase: Local Supabase config for development
- docs, task, AGENTS.md: Project docs and specs

Getting Started (frontend)

1) Install deps
   - cd frontend
   - bun install (or npm/yarn/pnpm)

2) Run dev server
   - bun run dev
   - Open http://localhost:3000

Environment

- Put app envs in `frontend/.env.local` (see `frontend/.env.example`).

Supabase (local dev)

- Initialize: already done via `supabase init` (see `supabase/config.toml`).
- Start/stop services: `supabase start` / `supabase stop` (requires Docker).
- Reset DB: `supabase db reset` (applies migrations and seeds if configured).
- Push to remote: `supabase db push` when ready to sync schema to the remote project.

Notes

- Node/Bun modules and build outputs are ignored under `frontend/`.
- CI/CD and deploy steps can target `frontend/` for the app, and use `supabase/` for DB operations.
