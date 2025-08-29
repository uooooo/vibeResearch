export type RagSnippet = {
  document_id: string;
  section?: string | null;
  text: string;
  score: number;
  meta?: any;
};

export async function searchRag(sb: any, input: { query: string; projectId?: string; limit?: number }): Promise<RagSnippet[]> {
  const q = (input.query || "").trim();
  if (!q) return [];
  const limit = Math.max(1, Math.min(20, input.limit ?? 5));
  try {
    let sel = sb.from("chunks").select("document_id, section, text").limit(limit * 2);
    if (input.projectId) sel = sel.in("document_id", sb.from("documents").select("id").eq("project_id", input.projectId) as any);
    // Simple keyword filter (ILIKE); database may not have FTS set up yet
    // Note: supabase-js doesn't support ILIKE in select directly via builder for text search; use contains on text
    const { data, error } = await sb.from("chunks").select("document_id, section, text").ilike("text", `%${q}%`).limit(limit * 2);
    if (error) return [];
    const items = (data || []).map((r: any) => ({ document_id: r.document_id, section: r.section, text: r.text, score: scoreHeuristic(r.text, q) }));
    items.sort((a, b) => b.score - a.score);
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

function scoreHeuristic(text: string, query: string): number {
  const t = text.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const term of terms) if (t.includes(term)) s += 1;
  return s + Math.min(1, text.length / 1000);
}

