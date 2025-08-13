export async function POST(req: Request) {
  const { allowRate } = await import("@/lib/utils/rate-limit");
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString();
  if (!allowRate(`export:plan:${ip}`, 10, 60_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const origin = req.headers.get("origin");
  const selfOrigin = new URL(req.url).origin;
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfOrigin).split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && !allow.includes(origin)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { z } = await import("zod");
  const schema = z.object({ projectId: z.string().uuid(), plan: z.any().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const { projectId } = parsed.data;

  const { createRouteUserClient } = await import("@/lib/supabase/server-route");
  const sbUser = await createRouteUserClient();
  if (!sbUser) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Load latest plan
  const { data: plans, error: planErr } = await sbUser
    .from("plans")
    .select("id, title, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (planErr) return Response.json({ ok: false, error: planErr.message }, { status: 500 });
  const plan = plans?.[0]?.content || null;
  if (!plan) return Response.json({ ok: false, error: "no_plan" }, { status: 400 });

  // Serialize to Markdown + stub CSL
  const md = planToMarkdown(plan);
  const csl = planToCSL(plan);

  // Persist to results (markdown + csl)
  try {
    await sbUser.from("results").insert([
      { project_id: projectId, type: "markdown", meta_json: { markdown: md } },
      { project_id: projectId, type: "csl", meta_json: { items: csl } },
    ]);
  } catch {}

  return Response.json({ ok: true, markdown: md, csl }, { headers: { "cache-control": "no-store" } });
}

function planToMarkdown(p: any): string {
  const lines: string[] = [];
  const title = p?.title || "Research Plan";
  lines.push(`# ${title}`);
  if (p?.rq) lines.push(`\n**Research Question**\n\n${p.rq}`);
  if (p?.hypothesis) lines.push(`\n**Hypothesis**\n\n${p.hypothesis}`);
  if (p?.data) lines.push(`\n**Data**\n\n${p.data}`);
  if (p?.methods) lines.push(`\n**Methods**\n\n${p.methods}`);
  if (p?.identification) lines.push(`\n**Identification**\n\n${p.identification}`);
  if (p?.validation) lines.push(`\n**Validation**\n\n${p.validation}`);
  if (p?.ethics) lines.push(`\n**Ethics**\n\n${p.ethics}`);
  return lines.join("\n");
}

function planToCSL(p: any): any[] {
  // If plan contains citations array, map into minimal CSL JSON items
  const cites = Array.isArray(p?.citations) ? p.citations : [];
  return cites.map((c: any, idx: number) => ({
    id: c.id || `ref-${idx + 1}`,
    type: c.type || "article-journal",
    title: c.title || "",
    author: Array.isArray(c.author)
      ? c.author.map((a: any) => ({ given: a.given || a.first || "", family: a.family || a.last || "" }))
      : undefined,
    issued: c.year ? { "date-parts": [[Number(c.year)]] } : undefined,
    DOI: c.doi || undefined,
    URL: c.url || undefined,
    containerTitle: c.journal || undefined,
  }));
}
