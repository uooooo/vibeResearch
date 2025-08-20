export async function POST(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`plans:regenerate:${ip}`, 20, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

  // Basic origin allowlist (same-host permitted by default)
  const origin = req.headers.get("origin");
  const self = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || self.origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === self.host : false);
  if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  // Validate payload
  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({
    projectId: z.string().uuid(),
    section: z.enum(["rq", "hypothesis", "data", "methods", "identification", "validation", "ethics"]).or(z.literal("title")),
    content: z.string().optional(),
    hints: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const { projectId, section, content } = parsed.data as any;

  // Auth (header bearer or cookie-based)
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Load latest plan content
  const { data: latest, error: selErr } = await sbUser
    .from("plans")
    .select("id, content, title")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (selErr) return Response.json({ ok: false, error: selErr.message }, { status: 500 });
  const current = (latest && latest[0]?.content) || {};

  // Stub regeneration: update a single field and append a marker
  const next: Record<string, any> = { ...current };
  if (section === "title") {
    next.title = String(content ?? current.title ?? "Research Plan") + " (revised)";
  } else {
    const prevVal = typeof current[section] === "string" ? String(current[section]) : "";
    const base = typeof content === "string" ? content : prevVal || `Draft ${section}`;
    next[section] = base.endsWith("(revised)") ? base : base + " (revised)";
  }

  // Insert new version
  const { data: inserted, error: insErr } = await sbUser
    .from("plans")
    .insert({ project_id: projectId, title: String(next.title || current.title || "Research Plan"), status: "draft", content: next })
    .select("id, project_id, title, status, content, created_at")
    .single();
  if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

  return Response.json({ ok: true, item: inserted }, { status: 201 });
}

