// Unified scholarly search tool with simple in-memory cache and fallback
// - Tries Semantic Scholar first (keyless allowed), then falls back to arXiv
// - Adds tiny backoff on initial empty/failed S2
// - Returns normalized CSL-like items

import type { CSLItem, ScholarlyQuery } from "@/lib/scholarly/semantic-scholar";
import { searchSemanticScholar } from "@/lib/scholarly/semantic-scholar";
import { searchArxiv } from "@/lib/scholarly/arxiv";

type Source = "s2" | "arxiv" | "none";

type CacheVal = { items: CSLItem[]; source: Source; expiry: number };
const cache = new Map<string, CacheVal>();
const TTL_MS = Number(process.env.SCHOLAR_CACHE_TTL_MS || 5 * 60_000);

function keyOf(q: ScholarlyQuery) {
  return JSON.stringify({ q: (q.query || "").trim(), limit: Math.max(1, Math.min(10, q.limit ?? 5)) });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scholarSearch(q: ScholarlyQuery): Promise<{ items: CSLItem[]; source: Source; latencyMs: number }> {
  const start = Date.now();
  const key = keyOf(q);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return { items: cached.items, source: cached.source, latencyMs: 0 };
  }

  const query = (q.query || "").trim();
  if (!query) return { items: [], source: "none", latencyMs: 0 };
  const limit = Math.max(1, Math.min(10, q.limit ?? 5));

  let items: CSLItem[] = [];
  let source: Source = "none";

  // Try Semantic Scholar (with one small retry if empty)
  try {
    items = await searchSemanticScholar({ query, limit });
    if (items.length === 0) {
      // Minimal backoff to mitigate transient throttling
      await delay(400);
      items = await searchSemanticScholar({ query, limit });
    }
  } catch {
    items = [];
  }
  if (items.length > 0) {
    source = "s2";
  } else {
    try {
      items = await searchArxiv(query, limit);
      source = items.length > 0 ? "arxiv" : "none";
    } catch {
      items = [];
      source = "none";
    }
  }

  const latencyMs = Date.now() - start;
  cache.set(key, { items, source, expiry: now + TTL_MS });
  return { items, source, latencyMs };
}

