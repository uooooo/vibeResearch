export async function GET(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`rag:search:${ip}`, 30, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const projectId = url.searchParams.get("projectId") || undefined;
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 5)));
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sb = await createRouteUserClient();
  const { search } = await import("@/lib/rag/search");
  const items = await search(sb, { query: q, projectId, limit });
  return Response.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}

