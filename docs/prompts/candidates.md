# Candidates Prompt (107-3)

- Purpose: Generate exactly 3 concise, distinct research theme candidates.
- Output schema: `{ "candidates": [{ "id": "t1", "title": "...", "novelty": 0..1, "risk": 0..1 }, ...] }`
- Constraints:
  - `id`: `t1`, `t2`, `t3` (stable short ids)
  - `title`: one-line, specific, testable
  - `novelty`, `risk`: numeric [0,1]
  - JSON only; no prose/markdown
- Hints: include domain, keywords, and user query/context when provided

References
- Source: `frontend/src/agents/prompts/candidates.ts`
- Parser: `frontend/src/lib/llm/json.ts` (`zCandidatesJSON`)

