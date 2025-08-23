export async function GET(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`metrics:toolinv:json:${ip}`, 10, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") || 500)));

  // Auth as user (RLS guards rows via runs.project_id ownership)
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sb = headerClient || cookieClient;
  if (!sb) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Filter by project via run ids (RLS still applies)
  let runIds: string[] | null = null;
  if (projectId) {
    const { data: runs } = await sb.from("runs").select("id").eq("project_id", projectId).order("started_at", { ascending: false }).limit(2000);
    runIds = (runs || []).map((r: any) => r.id);
    if (runIds.length === 0) return Response.json({ ok: true, items: [] }, { headers: { "cache-control": "no-store" } });
  }
  let q = sb.from("tool_invocations").select("run_id, tool, args, result, cost_usd, created_at").order("created_at", { ascending: false }).limit(limit);
  if (runIds) q = (q as any).in("run_id", runIds);
  const { data, error } = await q;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, items: data || [] }, { headers: { "cache-control": "no-store" } });
}

