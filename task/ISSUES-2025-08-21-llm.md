# Issues To Create — LLM, RAG, Eval (Aug 21, 2025)

Use GitHub CLI to create issues. Copy/paste each block.

Note: Labels used — `epic:107`, `epic:108`, `epic:109`, `area:backend`, `area:agents`, `area:infra`, `area:docs`.

## 107 — LLM Integration & Prompting

```bash
# 107-1 Provider abstraction and env/flags
gh issue create \
  -t "107-1: LLM provider abstraction + env/flags" \
  -b $'Design LlmProvider interface (send JSON, receive text/JSON), model options, token caps.\nAdd USE_REAL_LLM, OPENAI_API_KEY, GOOGLE_API_KEY to .env.local and docs.\nRisks: provider drift. Mitigation: isolate and record model + prompt_version.' \
  -l epic:107,area:backend,area:agents

# 107-2 Wire Vercel AI SDK (server)
gh issue create \
  -t "107-2: Wire @vercel/ai server-side client (with REST fallback)" \
  -b $'Add minimal @vercel/ai usage for chat/JSON on server routes. Keep REST fallback path to reduce coupling initially.\nStream support is optional for v1.' \
  -l epic:107,area:backend,area:agents

# 107-3 Prompt library scaffolding
gh issue create \
  -t "107-3: Prompt templates for candidates and plan" \
  -b $'Create agents/prompts/{candidates,plan}.ts with system prompts, inputs, and few-shot examples. Document in docs/prompts/.' \
  -l epic:107,area:agents,area:docs

# 107-4 Schemas and safe parser
gh issue create \
  -t "107-4: Zod schemas + tolerant JSON parser" \
  -b $'Define Candidate, Plan, PlanSection schemas. Add coercion and tolerant parsing with fallback stubs on error.' \
  -l epic:107,area:backend

# 107-5 Mastra: replace find-candidates step
gh issue create \
  -t "107-5: Mastra find-candidates via provider + prompts" \
  -b $'Call provider with candidates prompt. Emit progress to SSE. Persist candidates to results with provenance.' \
  -l epic:107,area:agents

# 107-6 Mastra: replace draft-plan + resume
gh issue create \
  -t "107-6: Mastra draft-plan with schema validation + resume glue" \
  -b $'Generate structured plan. Validate with zod, persist to plans. Ensure resume reads selection and proceeds.' \
  -l epic:107,area:agents

# 107-7 Telemetry and cost tracking
gh issue create \
  -t "107-7: Telemetry — tokens/latency/cost per run" \
  -b $'Capture model, tokens in/out, latency, cost estimates. Write to tool_invocations and surface basic view.' \
  -l epic:107,area:infra

# 107-8 Error handling and fallbacks
gh issue create \
  -t "107-8: Robust error handling + fallbacks" \
  -b $'Add budget guards, token caps, partial salvage, and user-friendly error messages in SSE.' \
  -l epic:107,area:backend

# 107-9 Docs for prompts and usage
gh issue create \
  -t "107-9: Document prompt rationale, schema, usage" \
  -b $'Add docs/prompts with rationale, variants, and schema notes. Update AGENTS.md with AI SDK status.' \
  -l epic:107,area:docs
```

## 108 — Scholarly & RAG

```bash
# 108-1 Scholarly clients
gh issue create \
  -t "108-1: arXiv + Semantic Scholar clients" \
  -b $'Implement minimal clients with normalization. Add retries/backoff and per-run caps.' \
  -l epic:108,area:backend

# 108-2 RAG ingestion pipeline
gh issue create \
  -t "108-2: Chunking + embeddings + pgvector" \
  -b $'Add chunker and embeddings ingestion to chunks table (pgvector). Link to documents.' \
  -l epic:108,area:backend

# 108-3 rag.search tool
gh issue create \
  -t "108-3: Implement rag.search (keyword + vector)" \
  -b $'Return top-k snippets with titles/urls and provenance for prompts.' \
  -l epic:108,area:agents

# 108-4 Prompt integration + citations
gh issue create \
  -t "108-4: Wire RAG into prompts + CSL citations" \
  -b $'Include context blocks and citation markers; export CSL in Markdown.' \
  -l epic:108,area:agents,area:docs
```

## 109 — Evaluation & Observability

```bash
# 109-1 Eval harness skeleton
gh issue create \
  -t "109-1: Evaluation harness + golden set" \
  -b $'Create docs/eval/golden and scripts/eval to run cases and compute metrics.' \
  -l epic:109,area:infra

# 109-2 Prompt A/B experiments
gh issue create \
  -t "109-2: Prompt variants and diff report" \
  -b $'Run A/B prompts with fixed params; compare schema pass rate and section coverage.' \
  -l epic:109,area:infra

# 109-3 Telemetry plumbing
gh issue create \
  -t "109-3: Persist model/tokens/latency + CSV export" \
  -b $'Record to tool_invocations; add a simple query or export to CSV for review.' \
  -l epic:109,area:infra

# 109-4 Safety and guardrails
gh issue create \
  -t "109-4: Token caps, truncation, content checks" \
  -b $'Implement max token limits, truncation, and basic content policies; ensure user-visible errors.' \
  -l epic:109,area:backend
```

