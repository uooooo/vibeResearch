export async function GET(req: Request) {
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const sbUser = supabaseUserFromRequest(req);
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  const { data, error } = await sbUser.from("projects").select("id,title,domain,created_at").order("created_at", { ascending: false });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, items: data }, { status: 200, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title: string | undefined = body?.title;
  const domain: string | undefined = body?.domain;
  if (!title) return Response.json({ ok: false, error: "title required" }, { status: 400 });

  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const sbUser = supabaseUserFromRequest(req);
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // owner_id assignment should be handled by RLS/trigger in Supabase
  const { data, error } = await sbUser.from("projects").insert({ title, domain }).select("id,title,domain,created_at").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, item: data }, { status: 201 });
}
