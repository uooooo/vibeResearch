export async function GET(req: Request) {
  // Basic rate limit: 60 req/min per IP
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`runs:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  let query = sbUser.from("runs").select("id, project_id, kind, status, started_at, ended_at").order("started_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, items: data }, { headers: { "cache-control": "no-store" } });
}
