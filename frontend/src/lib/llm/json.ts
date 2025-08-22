import { z } from "zod";

// Schemas
export const zCandidateItem = z.object({
  id: z.string().min(1).max(40).optional().transform((v) => v ?? ""),
  title: z.string().min(1).max(500),
  novelty: z.number().min(0).max(1).optional().transform((v) => (typeof v === "number" && isFinite(v) ? v : 0.5)),
  risk: z.number().min(0).max(1).optional().transform((v) => (typeof v === "number" && isFinite(v) ? v : 0.5)),
});
export const zCandidatesJSON = z.object({ candidates: z.array(zCandidateItem).min(1) });

export const zPlanJSON = z.object({
  title: z.string().min(1),
  rq: z.string().default(""),
  hypothesis: z.string().default(""),
  data: z.string().default(""),
  methods: z.string().default(""),
  identification: z.string().default(""),
  validation: z.string().default(""),
  ethics: z.string().default(""),
});

// Tolerant JSON extraction: fenced blocks → first JSON object/array → direct parse
export function extractJsonLike(text: string): any | undefined {
  if (!text || typeof text !== "string") return undefined;
  // Try direct
  try { return JSON.parse(text); } catch {}
  // Try fenced code blocks ```json ... ``` or ``` ... ```
  const fence = /```(?:json)?\n([\s\S]*?)```/i.exec(text);
  if (fence && fence[1]) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  // Try to locate first { ... } or [ ... ] conservatively
  const firstObj = text.indexOf("{");
  const lastObj = text.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    const slice = text.slice(firstObj, lastObj + 1);
    try { return JSON.parse(slice); } catch {}
  }
  const firstArr = text.indexOf("[");
  const lastArr = text.lastIndexOf("]");
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    const slice = text.slice(firstArr, lastArr + 1);
    try { return JSON.parse(slice); } catch {}
  }
  return undefined;
}

export function parseWithSchema<T>(text: string, schema: z.ZodSchema<T>): T | undefined {
  const raw = extractJsonLike(text);
  if (!raw) return undefined;
  const r = schema.safeParse(raw);
  if (r.success) return r.data;
  return undefined;
}

export function parseCandidatesLLM(text: string): z.infer<typeof zCandidatesJSON> | undefined {
  return parseWithSchema(text, zCandidatesJSON);
}

export function parsePlanLLM(text: string): z.infer<typeof zPlanJSON> | undefined {
  return parseWithSchema(text, zPlanJSON);
}

