# RAG Overview (v0.1)

Purpose
- Provide lightweight, owner-scoped retrieval to ground LLM outputs with short snippets from user-ingested sources.
- Serve Theme candidate generation first; expand to Plan drafting/refinement and export provenance.

Where It’s Used (today)
- Theme → Candidates (find-candidates step):
  - If `USE_RAG=1`, we query snippets with `rag.search` and inject them into the LLM prompt alongside scholarly hits.
  - Visible signal: candidates may be influenced by “RAG snippets” context in the prompt (and we can surface a `rag_hits` log if desired).
- Plan → (future):
  - Optional: refine sections using matching snippets (not enabled by default yet).
  - Export: map used snippets to CSL items (planned).

APIs
- Ingest: `POST /api/rag/ingest`
  - Payload: `{ projectId, title, text, embed? }`
  - Effect: creates `documents(project_id,title,source_url=null,metadata)`; splits `text` into paragraphs; inserts `chunks(document_id,idx,content,embedding)`.
  - Embedding: when `embed=true` and `OPENAI_API_KEY` is present, compute embedding (text-embedding-3-small) and store in `chunks.embedding` (pgvector dimension 1536). If embedding fails, `embedding` is null.
- Search: `GET /api/rag/search?q=...&projectId=...&limit=5`
  - Returns: top snippets (keyword-based for now). If `embedding` is available, we will add a vector similarity path next.

Data Model (supabase)
- `documents(id, project_id, title, source_url, metadata jsonb)`
- `chunks(id, document_id, idx, content, embedding vector(1536))`
  - RLS: Owner-only via `projects.owner_id` policies (see migrations).

Integration Points (code)
- Ingest
  - `frontend/src/lib/rag/split.ts` — paragraph-ish splitter with max ~1000 chars
  - `frontend/src/lib/rag/embedding.ts` — OpenAI embeddings helper
  - `frontend/src/lib/rag/ingest.ts` — inserts document + chunks; optional embeddings
  - Route: `frontend/src/app/api/rag/ingest/route.ts`
- Search
  - `frontend/src/lib/rag/search.ts` — keyword search (ILIKE) + heuristic scoring; vector search soon
  - Route: `frontend/src/app/api/rag/search/route.ts`
- Theme grounding
  - `frontend/src/workflows/mastra/theme.ts` — fetches `rag.search` when `USE_RAG=1` and injects top snippets into the candidate LLM prompt (alongside scholarly titles)

Flags & Env
- `USE_RAG=1` — enable prompt grounding with rag.search results in Theme
- `OPENAI_API_KEY` — required to compute embeddings (optional for keyword-only)
- `OPENAI_EMBEDDING_MODEL` (optional) — default `text-embedding-3-small`

Next Steps (108 roadmap)
- 108-2: Turn on embeddings by default on ingest (when key available); add vector similarity search (ORDER BY embedding <=> query_vector) with fallback to keyword.
- 108-3: Hybrid ranker (keyword + vector) and basic rerank; record provenance of used snippets per generation.
- 108-4: Export mapping — convert snippet/document metadata to CSL JSON and include references when context contributed to output.

Assumptions to Confirm
- Sources: start with pasted text; later support URLs/PDF (store `source_url` + fetched metadata).
- Chunking: paragraph-ish + size cap (~1000 chars). OK to start?
- Scope: Theme prompts first; Plan refine later (behind a flag) to avoid overreach.
- Storage volume: acceptable to store plain text chunks under project owner RLS.

If any of the above intent differs from your plan, please comment and we’ll adjust before deepening the implementation.

