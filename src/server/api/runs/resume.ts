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
