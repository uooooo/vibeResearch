export type RagSnippet = { document_id: string; idx: number; content: string; score: number };

export async function search(sb: any, input: { query: string; projectId?: string; limit?: number }): Promise<RagSnippet[]> {
  const q = (input.query || "").trim();
  if (!q) return [];
  const limit = Math.max(1, Math.min(20, input.limit ?? 5));
  // Keyword filter for now; vector search can be added when embeddings present
  try {
    let base = sb.from("chunks").select("document_id, idx, content").ilike("content", `%${q}%`).limit(limit * 2);
    if (input.projectId) {
      // filter by documents in this project
      const { data: docs } = await sb.from("documents").select("id").eq("project_id", input.projectId).limit(5000);
      const ids = (docs || []).map((d: any) => d.id);
      if (ids.length) base = base.in("document_id", ids);
    }
    const { data, error } = await base;
    if (error) return [];
    const items = (data || []).map((r: any) => ({ document_id: r.document_id, idx: r.idx, content: r.content, score: score(r.content, q) }));
    items.sort((a, b) => b.score - a.score);
    return items.slice(0, limit);
  } catch { return []; }
}

function score(text: string, q: string) {
  const t = text.toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const term of terms) if (t.includes(term)) s += 1;
  return s + Math.min(1, text.length / 1000);
}

