Top-level directories:
- `frontend/`: Next.js app
- `supabase/`: local dev config, migrations, seed
- `docs/`: design notes, DB schema, UI wireframes
- `task/`: epics and tasks markdown

Frontend structure (`frontend/src`):
- `app/`: App Router pages and API routes
  - Pages: `theme`, `plan`, `projects`, `workspace`, `export`, `auth`
  - API: `api/runs/start`, `api/runs/[id]/resume`, `api/plans`, `api/projects`, `api/results`, `api/export/plan`
  - Global styles: `app/globals.css`
- `agents/`: Mastra agents (e.g., `theme-finder.ts`)
- `workflows/`: Workflow implementations
  - `workflows/mastra/theme.ts`: Mastra-based theme workflow
  - `workflows/research-plan.ts`: plan workflow (review/finalize)
- `server/`: server-side helpers
  - `server/api/runs/start.ts`, `server/api/runs/resume.ts`
- `lib/`: utilities
  - `supabase/`: clients and session helpers
  - `rag/`, `scholarly/`: RAG and scholarly API clients (stubs present)
  - `project/context.tsx`: project context provider
- `db/`: Types (`types.ts`, `types.supabase.ts`)
- `ui/`: components and pages scaffolding

Configs (frontend root):
- `package.json`: scripts and deps
- `bun.lockb`
- `next.config.ts`
- `tsconfig.json` (strict true)
- `eslint.config.mjs`
- `postcss.config.mjs` (Tailwind v4 via `@tailwindcss/postcss`)

Supabase:
- `supabase/config.toml`
- `supabase/migrations/*_init.sql`, `*_projects_align.sql`, `*_results_extend.sql`, `*_workflow_runs.sql`
- `supabase/seed.sql`