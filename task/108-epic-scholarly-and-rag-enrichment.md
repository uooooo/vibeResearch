# 108: Scholarly Search & RAG Enrichment

- Status: Planned
- Owner: TBD
- Goal: Provide optional retrieval context (arXiv/Semantic Scholar + pgvector) to ground LLM outputs and collect citations.

## Milestones
1) Scholarly Clients: arXiv + Semantic Scholar minimal query wrappers + normalizers
2) RAG Basics: chunking, embedding, store in `chunks` with pgvector; keyword query → vector search
3) Tooling: `rag.search` tool to feed snippets into prompts; track provenance
4) Citations: map retrieved metadata to CSL and include in plan export

## Acceptance Criteria
- `rag.search` returns top-k snippets with titles/urls
- Plan draft can include citations when RAG used
- Export includes References and CSL items
