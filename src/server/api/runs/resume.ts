export async function postResume(req: Request, params: { id: string }): Promise<Response> {
  const contentType = { "content-type": "application/json" };
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
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
      const { supabaseServerClient } = await import("@/lib/supabase/server");
      const sb = supabaseServerClient();
      if (sb) {
        await sb.from("runs").update({ status: "running" }).eq("id", id);
        // Optionally, store a simple result payload
        // await sb.from("results").insert({ project_id: ..., run_id: id, type: 'plan', uri: 'inline', meta_json: plan });
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
