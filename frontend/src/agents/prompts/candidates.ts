export function buildCandidateMessages(input: { query?: string; domain?: string; keywords?: string }) {
  const system = [
    "You are a research theme exploration assistant.",
    "Your task: propose exactly 3 concise, distinct research theme candidates.",
    "Output strictly in JSON with the following schema:",
    "{\"candidates\":[{\"id\":\"t1\",\"title\":\"...\",\"novelty\":0.7,\"risk\":0.3},{...},{...}]}",
    "Constraints:",
    "- id: short stable id (t1,t2,t3)",
    "- title: one-line, specific and testable (no fluff)",
    "- novelty, risk: numbers in [0,1]",
    "- No prose, no markdown, no commentary — JSON only.",
  ].join("\n");

  const domainHint = input.domain
    ? `Focus domain: ${input.domain}. Prefer themes aligned with this domain.`
    : "";
  const keywordHint = input.keywords
    ? `Consider keywords: ${input.keywords}.`
    : "";
  const queryHint = input.query ? `User query/context: ${input.query}` : "";

  const user = [
    domainHint,
    keywordHint,
    queryHint,
    "Return only JSON matching the schema above.",
    "Example:",
    '{"candidates":[{"id":"t1","title":"Impact of LLM adoption on SME productivity","novelty":0.7,"risk":0.3},{"id":"t2","title":"Stablecoin shocks and DeFi liquidity","novelty":0.8,"risk":0.5},{"id":"t3","title":"RLHF data leakage in academic benchmarks","novelty":0.6,"risk":0.4}]}'
  ].filter(Boolean).join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ] as const;
}

export type CandidateItem = { id: string; title: string; novelty: number; risk: number };
export type CandidatesJSON = { candidates: CandidateItem[] };
