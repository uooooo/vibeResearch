export async function GET(req: Request) {
  // Basic rate limit: 60 req/min per IP
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`projects:get:${ip}`, 60, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
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
  // Origin allowlist
  const origin = req.headers.get("origin");
  const selfURL = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfURL.origin).split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === selfURL.host : false);
  if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({ title: z.string().min(1).max(200), domain: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const title: string = parsed.data.title;
  const domain: string | undefined = parsed.data.domain;

  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let userId: string | null = null;
  try {
    const { data: authData } = await (sbUser as any).auth.getUser();
    userId = authData?.user?.id || null;
  } catch {
    userId = null;
  }

  // owner_id assignment should be handled by RLS/trigger in Supabase
  // For robustness against misconfigured triggers, explicitly set owner_id as auth.uid()
  const { data, error } = await sbUser
    .from("projects")
    .insert({
      // Keep legacy schema compatibility: projects.name is NOT NULL in initial migration
      name: title,
      title,
      domain,
      ...(userId ? { owner_id: userId } : {}),
    } as any)
    .select("id,title,domain,created_at")
    .single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, item: data }, { status: 201 });
}
