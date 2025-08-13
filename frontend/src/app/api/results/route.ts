export async function GET(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`results:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const type = url.searchParams.get("type") || undefined;

  // Prefer new columns if present: project_id, type, meta_json
  let query = sbUser
    .from("results")
    .select("id, project_id, run_id, type, uri, meta_json, created_at")
    .order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  if (type) query = query.eq("type", type);

  const { data, error } = await query as any;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });

  const items = Array.isArray(data) ? data : [];
  return Response.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}
