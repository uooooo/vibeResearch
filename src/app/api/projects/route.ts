export async function GET() {
  const { supabaseServerClient } = await import("@/lib/supabase/server");
  const sb = supabaseServerClient();
  if (!sb) {
    return Response.json({ ok: true, items: [], note: "Supabase not configured" }, { status: 200 });
  }
  const { data, error } = await sb.from("projects").select("id,title,domain,created_at").order("created_at", { ascending: false });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, items: data }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title: string | undefined = body?.title;
  const domain: string | undefined = body?.domain;
  if (!title) return Response.json({ ok: false, error: "title required" }, { status: 400 });

  const { supabaseServerClient } = await import("@/lib/supabase/server");
  const sb = supabaseServerClient();
  if (!sb) return Response.json({ ok: false, error: "Supabase not configured" }, { status: 501 });

  // NOTE: owner_id assignment should be handled by RLS/trigger in Supabase
  const { data, error } = await sb.from("projects").insert({ title, domain }).select("id,title,domain,created_at").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, item: data }, { status: 201 });
}

