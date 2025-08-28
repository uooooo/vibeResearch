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

## Breakdown (Stories)
- [ ] Golden Set: create `docs/eval/golden/*.json` with input domains and expected output constraints
- [ ] Harness: script to run agents with fixed seeds/params; record metrics to `docs/eval/results/*.json`
- [ ] Metrics: schema validation rate, section coverage, token usage, latency; compute summary
- [ ] A/B Config: allow selecting prompt variants and parameters; diff outputs and metrics
- [ ] Safety: max tokens per step, truncation policy, forbidden content checks, refusal behavior
- [x] Observability: persist `tool_invocations` with model/latency; add simple query or CSV export
- [ ] Docs: write `docs/eval/README.md` describing process and how to interpret metrics

## Risks / Mitigations
- Flaky results: fix seeds and parameters where possible; analyze variance across runs
- Overfitting prompts: keep holdout cases; document changes and rationale
