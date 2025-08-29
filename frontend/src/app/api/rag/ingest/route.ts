export async function POST(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`rag:ingest:${ip}`, 5, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({ projectId: z.string().uuid(), title: z.string().min(1), text: z.string().min(1), embed: z.boolean().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sb = await createRouteUserClient();
  const { ingestPlain } = await import("@/lib/rag/ingest");
  const res = await ingestPlain(sb, { ...parsed.data, computeEmbedding: parsed.data.embed === true } as any);
  return Response.json(res, { headers: { "cache-control": "no-store" } });
}

