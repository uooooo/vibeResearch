export async function GET(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`plans:history:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const limit = Number(url.searchParams.get("limit") || 10);
  if (!projectId) return Response.json({ ok: false, error: "missing_projectId" }, { status: 400, headers: { "cache-control": "no-store" } });
  const { data, error } = await sbUser
    .from("plans")
    .select("id, project_id, title, status, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, items: data || [] }, { headers: { "cache-control": "no-store" } });
}
