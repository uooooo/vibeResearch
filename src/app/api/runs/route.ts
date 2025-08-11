export async function GET(req: Request) {
  const { supabaseServerClient } = await import("@/lib/supabase/server");
  const sb = supabaseServerClient();
  if (!sb) return Response.json({ ok: true, items: [], note: "Supabase not configured" });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  let query = sb.from("runs").select("id, project_id, kind, status, started_at, ended_at").order("started_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, items: data });
}
