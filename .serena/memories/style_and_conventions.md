Languages and style:
- TypeScript everywhere, `tsconfig.json` has `strict: true`
- React 19 with Next.js App Router; use server components where appropriate
- Tailwind CSS v4 for styling; PostCSS configured via `@tailwindcss/postcss`
- ESLint v9 with `eslint-config-next` 15.4.6; run `next lint`
- Prettier not configured yet; rely on IDE/ESLint formatting where applicable

Conventions:
- Keep agents and workflows in `src/agents` and `src/workflows`
- API routes live under `src/app/api/*`
- Utilities grouped under `src/lib/*` (supabase, rag, scholarly, utils)
- Keep DB types in `src/db`; regenerate via script when schema changes
- Use environment variables from `frontend/.env.local` (do not commit)
- Keep changes minimal and focused; follow existing file/module naming

Security and data:
- Supabase RLS expected; respect `projects.owner_id = auth.uid()` patterns
- Store Mastra snapshots in `workflow_runs` mapping to `runs.id` where applicable

Docs and tasks:
- Update `AGENTS.md` and `docs/*` when adding major components
- Track work in `/task/*.md` with clear, meaningful names