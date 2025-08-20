Setup and dev (frontend):
- Install deps: `cd frontend && bun install` (or npm/yarn/pnpm)
- Dev server: `cd frontend && bun run dev` → http://localhost:3000
- Lint: `cd frontend && bun run lint` (Next.js ESLint)
- Build: `cd frontend && bun run build`
- Start prod server: `cd frontend && bun run start`

Supabase (requires Docker and supabase CLI):
- Start services: `supabase start`
- Stop services: `supabase stop`
- Reset DB: `supabase db reset`
- Generate types: `cd frontend && bun run db:types` (writes `src/db/types.supabase.ts`)

Scripts (from `frontend/package.json`):
- `dev`: `next dev --turbopack`
- `build`: `NEXT_DISABLE_ESLINT=1 next build`
- `start`: `next start`
- `lint`: `next lint`
- `db:start`: `cd .. && supabase start`
- `db:stop`: `cd .. && supabase stop`
- `db:reset`: `cd .. && supabase db reset`
- `db:types`: `cd .. && supabase gen types typescript --local > frontend/src/db/types.supabase.ts`

Environment:
- Copy `frontend/.env.example` to `frontend/.env.local` and fill required keys (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.)