export async function POST(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`citations:suggest:${ip}`, 10, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const origin = req.headers.get("origin");
  const self = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || self.origin).split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === self.host : false);
  if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({ projectId: z.string().uuid().optional(), title: z.string().optional(), rq: z.string().optional(), keywords: z.string().optional(), limit: z.number().int().min(1).max(10).optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const { projectId, title, rq, keywords, limit } = parsed.data as any;

  // Auth via user (RLS based on project-owned endpoints if later used). No DB writes here.
  const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
  const headerClient = supabaseUserFromRequest(req);
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const cookieClient = await createRouteUserClient();
  const sbUser = headerClient || cookieClient;
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const qParts = [title, rq, keywords].filter((s) => typeof s === "string" && s.trim().length > 0) as string[];
  const query = qParts.join(" ").trim();
  if (!query) return Response.json({ ok: true, items: [] }, { headers: { "cache-control": "no-store" } });
  const { searchSemanticScholar } = await import("@/lib/scholarly/semantic-scholar");
  const { searchArxiv } = await import("@/lib/scholarly/arxiv");
  let items: any[] = [];
  try {
    items = await searchSemanticScholar({ query, limit: limit ?? 5 });
  } catch { items = []; }
  if (items.length === 0) {
    try { items = await searchArxiv(query, limit ?? 5); } catch { items = []; }
  }
  return Response.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}

