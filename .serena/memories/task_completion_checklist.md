Before wrapping a task:
- Run lint: `cd frontend && bun run lint`
- Build app: `cd frontend && bun run build` (ensures no TS/Next build errors)
- If DB changes: apply migrations locally and regenerate types (`bun run db:types`)
- Update docs: reflect changes in `AGENTS.md`, `docs/*`, or `/task/*.md` if relevant
- Verify envs: no secrets committed; ensure `.env.local` usage
- Summarize changes and next steps in PR description