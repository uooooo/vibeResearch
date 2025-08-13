export async function POST(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`plans:restore:post:${ip}`, 20, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const origin = req.headers.get("origin");
  const self = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || self.origin).split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === self.host : false);
  if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({ planId: z.string().uuid() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const { planId } = parsed.data;

  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Load the original plan (RLS enforces ownership)
  const { data: orig, error: selErr } = await sbUser.from("plans").select("id, project_id, title, status, content").eq("id", planId).single();
  if (selErr) return Response.json({ ok: false, error: selErr.message }, { status: 404 });

  // Insert a new version (copy content). Title/status can be carried or marked as draft.
  const { data: inserted, error: insErr } = await sbUser
    .from("plans")
    .insert({ project_id: orig.project_id, title: orig.title, status: "draft", content: orig.content })
    .select("id, project_id, title, status, created_at")
    .single();
  if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

  return Response.json({ ok: true, restored: inserted }, { status: 201 });
}
