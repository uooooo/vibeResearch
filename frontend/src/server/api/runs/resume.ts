type Ctx = { sb?: any };
export async function postResume(req: Request, params: { id: string }, ctx: Ctx = {}): Promise<Response> {
  const contentType = { "content-type": "application/json" };
  try {
    const { id } = params;
    const { z } = await import("zod");
    const schema = z.object({ answers: z.object({ selected: z.object({ id: z.string(), title: z.string() }).optional() }).optional() });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), { headers: contentType, status: 400 });
    const body = parsed.data as any;
    const selected = body?.answers?.selected ?? null;

    // Minimal draft plan generation (stub). Replace with Mastra workflow later.
    const title: string = selected?.title || "Selected Theme";
    const plan = {
      title,
      rq: `What is the impact/effect of ${title.toLowerCase()}?`,
      hypothesis: `We hypothesize ${title.toLowerCase()} yields measurable improvements with trade-offs.`,
      data: "Outline target datasets/sources (public stats, platform logs, paper corpora)",
      methods: "Candidate methods: descriptive, DiD, IV, synthetic control, ablation/robustness",
      identification: "Assumptions and threats; proxies; instruments; falsification checks",
      validation: "Holdout evaluation; sensitivity; placebo; external benchmark",
      ethics: "Bias, privacy, consent, misuse considerations; mitigation steps",
    };

    // If id is a DB run id (uuid), try to update status to running/resumed
    try {
      const sb = ctx.sb ?? null;
      if (sb) {
        // Update run status and fetch project_id for results
        const { data: runRow } = await sb.from("runs").update({ status: "running" }).eq("id", id).select("id,project_id").single();
        if (runRow?.project_id) {
          await sb.from("results").insert({
            project_id: runRow.project_id,
            run_id: id,
            type: "plan",
            uri: "inline:plan",
            meta_json: plan,
          });
        }
      }
    } catch {
      // ignore persistence errors
    }

    const payload = {
      ok: true,
      status: "resumed",
      id,
      plan,
      selected,
    };
    return new Response(JSON.stringify(payload), { headers: contentType, status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "unknown" }),
      { headers: { "content-type": "application/json" }, status: 500 }
    );
  }
}
