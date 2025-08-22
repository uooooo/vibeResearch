# 107: LLM Integration & Prompting (from mock → real agents)

- Status: Planned
- Owner: TBD
- Goal: Replace mock candidate/plan generation with real LLM-backed agents (Mastra), with prompt library, schema validation, and safe fallbacks.

## Milestones
1) Provider Abstraction: server-side LLM client (OpenAI/Google) + env wiring + rate limits
2) Prompt Library: reusable templates for candidates/plan; zod schemas for outputs
3) Mastra Steps: replace `find-candidates` and `draft-plan` with LLM calls; emit progress; persist results
4) Fallbacks & Flags: `USE_REAL_LLM` feature flag; JSON-parse fallback to stub; error handling
5) Telemetry: capture tokens/costs/timings into `tool_invocations`

## Deliverables
- `lib/llm/provider.ts` (REST-based, no SDK dependency initially)
- `agents/prompts/{candidates,plan}.ts` templates + docs (`docs/prompts/*.md`)
- Updated `workflows/mastra/theme.ts` using provider + prompts; strict zod parsing
- Feature flags via env; runtime-safe fallbacks
- Minimal docs: usage, keys, limits

## Acceptance Criteria
- Theme Explorer produces LLM-derived candidates when `USE_REAL_LLM=1`
- Resume produces LLM-derived plan JSON valid against schema; version recorded in `plans`
- Errors do not crash flows; stub fallback works; logs stored

## Notes
- Streaming can be added later; start non-streaming for simplicity
- Consider @vercel/ai later; start with REST to reduce deps

## Breakdown (Stories)
- [ ] Env & Flags: add `USE_REAL_LLM`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` to `.env.local` and config docs
- [ ] Provider Interface: design `LlmProvider` interface (send JSON, receive text/JSON), model options, token caps
- [ ] AI SDK Wiring: add minimal `@vercel/ai` server usage for chat/JSON; keep REST fallback path
- [ ] Prompt Library: create `agents/prompts/{candidates,plan}.ts` with inputs, system prompts, few-shot examples
- [ ] Schemas: define zod schemas for `Candidate`, `Plan`, `PlanSection`; strict parsing + coercion helpers
- [ ] Mastra Step: implement `find-candidates` with provider + prompts; emit incremental progress/logs
- [ ] Mastra Step: implement `draft-plan` (+ resume) with provider + schema validation; persist `results`/`plans`
- [ ] Fallbacks: tolerant JSON parser, partial result salvage, safe defaults on parse error
- [ ] Telemetry: capture `model`, tokens in/out, latency, cost; write to `tool_invocations`
- [ ] Params: centralize temperature/topP/length limits; surface via feature flag/config
- [ ] Docs: `docs/prompts/` for rationale, variants, and schema notes
- [ ] Context7: consult Mastra and Vercel AI SDK docs via Context7 MCP when implementing

## Risks / Mitigations
- Parsing fragility: use constrained JSON modes + zod refinements; fallback stubs
- Cost spikes: default to conservative lengths; early stopping; budget guard per run
- Provider drift: isolate behind interface; record `model` + `prompt_version`
