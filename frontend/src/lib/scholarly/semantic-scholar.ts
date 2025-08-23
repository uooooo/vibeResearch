// Minimal Semantic Scholar client (108-1)
// Docs: https://api.semanticscholar.org/api-docs/

export type ScholarlyQuery = { query: string; limit?: number };
export type CSLItem = {
  id?: string;
  type?: string;
  title?: string;
  author?: { given?: string; family?: string }[];
  issued?: { "date-parts": number[][] };
  DOI?: string;
  URL?: string;
  containerTitle?: string;
};

export async function searchSemanticScholar(q: ScholarlyQuery): Promise<CSLItem[]> {
  const query = (q.query || "").trim();
  if (!query) return [];
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const limit = Math.max(1, Math.min(10, q.limit ?? 5));
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "title,year,authors,url,externalIds,venue");
  const headers: Record<string, string> = { accept: "application/json" };
  if (key) headers["x-api-key"] = key;
  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) return [];
  const data: any = await resp.json().catch(() => ({}));
  const papers: any[] = Array.isArray(data?.data) ? data.data : [];
  return papers.map((p: any, i: number): CSLItem => ({
    id: p?.paperId || p?.externalIds?.DOI || `s2-${i + 1}`,
    type: "article-journal",
    title: p?.title || undefined,
    author: Array.isArray(p?.authors)
      ? p.authors.map((a: any) => ({ given: a?.name?.split(" ")?.[0] || "", family: a?.name?.split(" ")?.slice(1).join(" ") || "" }))
      : undefined,
    issued: p?.year ? { "date-parts": [[Number(p.year)]] } : undefined,
    DOI: p?.externalIds?.DOI || undefined,
    URL: p?.url || undefined,
    containerTitle: p?.venue || undefined,
  }));
}

