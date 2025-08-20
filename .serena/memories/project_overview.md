Purpose: vibeResearch is a “Research Copilot” to accelerate (1) theme exploration, (2) research plan creation, and (3) structured outputs (Markdown + CSL), with future expansion to analysis execution.

Scope: Initial domains are Economics / AI / Crypto. Primary deliverables: Markdown with references (CSL), plan YAML/JSON, and run logs.

Tech stack:
- Frontend: Next.js App Router (15.4.6), TypeScript, React 19
- Styling: Tailwind CSS v4, shadcn/ui (planned), Radix UI (planned)
- Agent framework: Mastra (suspend/resume for HITL)
- Backend: Next.js API routes under `src/app/api`
- DB: Supabase (Postgres + pgvector, Storage, Auth, RLS)
- RAG: pgvector now, consider LlamaIndex.ts later
- LLM: OpenAI / Google AI (switchable)
- Streaming: Vercel AI SDK (planned)
- Deploy: Vercel

Repository layout:
- `frontend/`: Next.js app with agents, workflows, API routes, UI
- `supabase/`: Local Supabase project, migrations, seed, config
- `docs/`: Specs, DB notes, UI wireframes
- `task/`: Work items and epics
- Root docs: `AGENTS.md` (design), `README.md` (getting started)

Key features implemented:
- ThemeFinder agent (`src/agents/theme-finder.ts`)
- Research plan workflows (`src/workflows/research-plan.ts`, `src/workflows/mastra/theme.ts`)
- API routes for runs start/resume (`src/app/api/runs/...`)
- Supabase migrations for core tables including `workflow_runs`

Environment:
- Place app envs in `frontend/.env.local` (see `frontend/.env.example`). Keys include: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and others as needed).