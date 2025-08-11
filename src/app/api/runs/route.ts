export async function GET() {
  const { supabaseServerClient } = await import("@/lib/supabase/server");
  const sb = supabaseServerClient();
  if (!sb) return Response.json({ ok: true, items: [], note: "Supabase not configured" });
  const { data, error } = await sb
    .from("runs")
    .select("id, project_id, kind, status, started_at, ended_at")
    .order("started_at", { ascending: false });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, items: data });
}

