# 109: Evaluation & Observability

- Status: Planned
- Owner: TBD
- Goal: Establish a lightweight eval loop and runtime observability for prompt/parameter tuning.

## Milestones
1) Eval Harness: golden cases + metrics (schema pass rate, section completeness, length bands)
2) Prompt Experiments: prompt variants tracked in docs; A/B config and diff report
3) Telemetry: token usage, latency, cost estimates per run; UI surface for recent runs/logs (#29)
4) Safety: token caps, truncation policy, basic content policy checks

## Acceptance Criteria
- `scripts/eval` shows a pass/fail summary on golden set
- PRs can link to eval summary outputs
- `tool_invocations` records tokens/latency; basic dashboard exists (or CSV export)
