export function buildCandidateMessages(input: { query?: string; domain?: string; keywords?: string }) {
  const system = `You are a research theme exploration assistant. Produce 3 concise theme candidates as JSON with fields: id (short id), title (one line), novelty (0..1), risk (0..1).`;
  const user = `Domain: ${input.domain || ""}\nQuery: ${input.query || ""}\nKeywords: ${input.keywords || ""}\n\nReturn ONLY a JSON array named candidates, like: {"candidates":[{"id":"t1","title":"...","novelty":0.7,"risk":0.3}, ...]}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ] as const;
}

export type CandidateItem = { id: string; title: string; novelty: number; risk: number };
export type CandidatesJSON = { candidates: CandidateItem[] };

