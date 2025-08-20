# Runs Workflow: Start (SSE) and Resume (Mastra)

This documents the MVP wiring for EPIC-101.

## Start: POST /api/runs/start (SSE)
- Input: `{ kind: "theme", input: { query?, projectId?, domain?, keywords? } }`
- Emits events:
  - `started`: `{ type, at, input, runId? }`
  - `progress`: `{ type, message }` (multiple)
  - `candidates`: `{ type, items: ThemeCandidate[] }`
  - `suspend`: `{ type, reason: "select_candidate" }`
- Persistence:
  - `runs`: inserted when `projectId` provided (status `running`).
  - `results`: on `candidates`, stored as `{ type: "candidates", meta_json: { items } }`.
  - `workflow_runs`: maps `runs.id` to Mastra `mastra_run_id` with `snapshot`.

## Resume: POST /api/runs/{id}/resume
- Input: `{ answers: { selected: { id, title } } }`
- Behavior:
  1) If `workflow_runs` has `mastra_run_id`, call Mastra `resume()` with `selected`.
  2) Fallback: local `draftPlanFromSelection()` to produce a DraftPlan.
- Persistence:
  - `results`: insert `{ type: "plan", meta_json: plan }` (scoped to `run_id`/`project_id`).
  - `plans`: insert new draft version for Plan Editor (versioned editing flow).
  - `workflow_runs`: update latest `snapshot` from Mastra resume.
  - `runs`: set `status=completed`, `finished_at`.

## Example
```bash
# Start
curl -N -X POST \
  -H 'content-type: application/json' \
  -d '{"kind":"theme","input":{"query":"AI safety","projectId":"<uuid>"}}' \
  http://localhost:3000/api/runs/start

# Resume
curl -X POST \
  -H 'content-type: application/json' \
  -d '{"answers":{"selected":{"id":"cand_1","title":"AI safety governance"}}}' \
  http://localhost:3000/api/runs/<runId>/resume
```
