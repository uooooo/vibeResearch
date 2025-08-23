export function buildPlanMessages(input: { title: string }) {
  const system = [
    "You are a research planning assistant.",
    "Produce a structured research plan in strict JSON with keys:",
    "{title, rq, hypothesis, data, methods, identification, validation, ethics}",
    "All values are concise strings. No markdown, no commentary, JSON only.",
    "Guidance:",
    "- rq: a crisp, testable research question",
    "- hypothesis: falsifiable statement",
    "- data: concrete sources/datasets",
    "- methods: econometrics/ML/experimental methods as applicable",
    "- identification: assumptions, threats, instruments/design",
    "- validation: evaluation, robustness, sensitivity",
    "- ethics: privacy, bias, consent, misuse mitigation",
  ].join("\n");

  const user = [
    `Selected Theme Title: ${input.title}`,
    "Return ONLY the JSON object with the keys specified.",
    "Example:",
    '{"title":"Impact of LLM adoption on SME productivity","rq":"Does LLM adoption increase SME productivity?","hypothesis":"SMEs adopting LLMs achieve measurable productivity gains vs. matched controls.","data":"Firm-level productivity metrics, adoption logs, survey panels","methods":"Difference-in-differences; matching; event study; robustness checks","identification":"Parallel trends; instrument: staged rollout; placebo tests","validation":"Holdout validation; sensitivity analysis; external benchmarks","ethics":"Data privacy; consent; bias mitigation; secure storage"}'
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ] as const;
}

export type PlanJSON = {
  title: string;
  rq: string;
  hypothesis: string;
  data: string;
  methods: string;
  identification: string;
  validation: string;
  ethics: string;
};
