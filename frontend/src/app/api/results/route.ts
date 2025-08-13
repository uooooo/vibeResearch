export async function GET(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`results:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const type = url.searchParams.get("type") || undefined; // optional hint (e.g., "plan")

  // Current DB schema: results(id, run_id, content, created_at) with project_id on runs.
  // Join results->runs to filter by project and return a stable shape for the UI.
  const sel = "id,run_id,content,created_at,runs!inner(project_id)";
  let query = sbUser.from("results").select(sel).order("created_at", { ascending: false });
  if (projectId) query = query.eq("runs.project_id", projectId);
  const { data, error } = await query as any;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });

  let items = Array.isArray(data) ? data.map((row: any) => ({
    id: row.id,
    project_id: row.runs?.project_id ?? null,
    run_id: row.run_id,
    // Normalize to previous UI expectation: expose content as meta_json
    meta_json: row.content ?? null,
    created_at: row.created_at,
  })) : [];

  // If a type is requested, allow coarse filtering by content shape
  if (type === "plan") {
    items = items.filter((r: any) => r.meta_json && typeof r.meta_json === "object" && ("rq" in r.meta_json || "methods" in r.meta_json));
  }

  return Response.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}
