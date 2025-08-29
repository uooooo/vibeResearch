import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = String(body?.projectId || "").trim();
    if (!projectId) return Response.json({ ok: false, error: "invalid_project" }, { status: 400 });

    const { createRouteUserClient } = await import("@/lib/supabase/server-route");
    const sb = await createRouteUserClient();
    if (!sb) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

    // Load latest saved theme selection
    const { data, error } = await sb
      .from("results")
      .select("id, meta_json, created_at")
      .eq("project_id", projectId)
      .eq("type", "themes_selected")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    const latest = Array.isArray(data) && data.length ? (data[0] as any) : null;
    const items: any[] = latest?.meta_json?.items || [];
    if (items.length === 0) return Response.json({ ok: false, error: "no_selection" }, { status: 400 });

    // Compose simple background from evidence
    const drafts = items.slice(0, 10).map((c: any, idx: number) => {
      const title = String(c?.title || `Theme ${idx + 1}`);
      const ev: any[] = Array.isArray(c?.evidence) ? c.evidence : [];
      const bullets = ev.slice(0, 5).map((e) => `- ${String(e?.text || '').trim()}`).filter(Boolean).join('\n');
      const background = bullets ? `# Background / Prior Work\n\n## ${title}\n${bullets}` : '';
      return { title, content: { title, rq: '', hypothesis: '', data: '', methods: '', identification: '', validation: '', ethics: '', background }, status: 'draft' };
    });

    // Insert drafts into plans
    const payload = drafts.map((d) => ({ project_id: projectId, title: d.title, status: d.status, content: d.content }));
    const { data: inserted, error: insErr } = await sb.from("plans").insert(payload).select("id, title, created_at");
    if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

    return Response.json({ ok: true, count: inserted?.length || 0, items: inserted || [] }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}

