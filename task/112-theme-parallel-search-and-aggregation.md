# 112: Theme Parallel Search & Aggregation

- Status: Proposed
- Priority: High
- Owner: TBD

Goal
- Implement Theme v1a: run Provider(Perplexity) + Scholarly in parallel, normalize/dedupe, score and rank candidates with evidence, and stream results to the UI.

Scope
- Adapters: `lib/tools/provider-deep-research.ts` (placeholder), use existing `scholar.ts`, and `perplexity.ts`
- Aggregator: normalize → dedupe → scoring (novelty/feasibility/risk) → rank → top-K
- SSE: ensure `insights` (bullets) and `candidates` stream with progress logs
- Persist: results(type='candidates'), telemetry(tool_invocations)
- UI: show scores + evidence (titles/insights), compare and select

Acceptance Criteria
- Theme run returns 3–5 ranked candidates with scores and 1–3 evidence bullets each
- Logs show provider/scholar activity and latency
- Selection flows to Plan (Workflow tab) cleanly

Notes
- See `docs/theme/requirements.md` for spec and scoring details
- Future: facets for narrow-down, conclusion/future-work extraction, RAG integration

