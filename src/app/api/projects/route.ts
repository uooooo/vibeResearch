export async function GET(req: Request) {
  // Basic rate limit: 60 req/min per IP
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`projects:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  const { data, error } = await sbUser.from("projects").select("id,title,domain,created_at").order("created_at", { ascending: false });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, items: data }, { status: 200, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  // Basic rate limit: 20 req/min per IP
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`projects:post:${ip}`, 20, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  // Origin check
  const origin = req.headers.get("origin");
  const selfOrigin = new URL(req.url).origin;
  if (origin && origin !== selfOrigin) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const title: string | undefined = body?.title;
  const domain: string | undefined = body?.domain;
  if (!title) return Response.json({ ok: false, error: "title required" }, { status: 400 });

  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // owner_id assignment should be handled by RLS/trigger in Supabase
  const { data, error } = await sbUser.from("projects").insert({ title, domain }).select("id,title,domain,created_at").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, item: data }, { status: 201 });
}
