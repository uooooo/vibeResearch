export type Plan = {
  title: string;
  rq: string;
  hypothesis: string;
  data: string;
  methods: string;
  identification: string;
  validation: string;
  ethics: string;
};

export function buildPlanRefineMessages(input: { original: Plan; review: string }) {
  const system = [
    "You are a research planning assistant.",
    "Refine the given plan according to the review comments.",
    "Return strict JSON with the same keys: {title, rq, hypothesis, data, methods, identification, validation, ethics}.",
    "Do not add commentary or markdown. JSON only.",
  ].join("\n");

  const user = [
    "Original plan JSON:",
    JSON.stringify(input.original),
    "\nReview comments (constraints):",
    input.review,
    "\nReturn ONLY the refined plan JSON with the same keys.",
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ] as const;
}

