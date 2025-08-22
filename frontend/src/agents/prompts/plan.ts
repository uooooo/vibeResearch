export function buildPlanMessages(input: { title: string }) {
  const system = `You are a research planning assistant. Produce a structured research plan as JSON with fields: title, rq, hypothesis, data, methods, identification, validation, ethics (all strings).`;
  const user = `Selected Theme Title: ${input.title}\n\nReturn ONLY JSON object with the keys specified.`;
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

