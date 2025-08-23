## Plan Prompt (107-3)

- Purpose: Draft a structured research plan from a selected theme title.
- Output schema (all values strings):
  `{ title, rq, hypothesis, data, methods, identification, validation, ethics }`
- Guidance included in system message to improve structure and coverage.
- JSON only; no prose/markdown.

References
- Source: `frontend/src/agents/prompts/plan.ts`
- Parser: `frontend/src/lib/llm/json.ts` (`zPlanJSON`)

