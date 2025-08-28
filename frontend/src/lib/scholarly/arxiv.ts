// Minimal arXiv client (108-1)
// API: http://export.arxiv.org/api/query?search_query=all:query&start=0&max_results=5

import type { CSLItem } from "./semantic-scholar";

export async function searchArxiv(query: string, limit = 5): Promise<CSLItem[]> {
  const q = (query || "").trim();
  if (!q) return [];
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${Math.max(1, Math.min(10, limit))}`;
  const resp = await fetch(url, { headers: { accept: "application/atom+xml" } });
  if (!resp.ok) return [];
  const text = await resp.text();
  // Very lightweight parsing for title, link, authors, published year
  const entries = text.split("<entry>").slice(1);
  const items: CSLItem[] = [];
  for (const e of entries) {
    const title = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").trim().replace(/\s+/g, " ");
    const link = e.match(/<link[^>]*href=\"([^\"]+)\"[^>]*rel=\"alternate\"/i)?.[1] || e.match(/<id>([^<]+)<\/id>/)?.[1] || undefined;
    const published = e.match(/<published>(\d{4})-\d{2}-\d{2}/)?.[1];
    const authors = Array.from(e.matchAll(/<name>([^<]+)<\/name>/g)).map((m) => m[1]);
    items.push({
      id: link || undefined,
      type: "article-journal",
      title: title || undefined,
      author: authors.map((n) => ({ given: n.split(" ")[0] || "", family: n.split(" ").slice(1).join(" ") || "" })),
      issued: published ? { "date-parts": [[Number(published)]] } : undefined,
      URL: link,
      containerTitle: "arXiv",
    });
  }
  return items;
}

