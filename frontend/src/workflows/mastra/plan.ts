// Mastra ResearchPlanWorkflow: Draft -> suspend(review) -> Finalize
import { z } from "zod";
import { createProvider } from "@/lib/llm/provider";
import { buildPlanMessages, type PlanJSON } from "@/agents/prompts/plan";
import { parsePlanLLM } from "@/lib/llm/json";

export type PlanStartInput = {
  title?: string;
  rq?: string;
  domain?: string;
  keywords?: string;
  projectId?: string;
};

export async function startPlanMastra(input: PlanStartInput) {
  const dynamicImport: any = (eval("import") as any);
  const mod: any = await dynamicImport("mastra").catch(() => null);
  if (!mod) throw new Error("Mastra not installed");
  const { createStep, createWorkflow } = mod as any;

  const draftPlan = createStep({
    id: "draft-plan",
    description: "Draft an initial research plan",
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ plan: z.any() }).passthrough(),
    async execute({ inputData }: any) {
      const title = String(inputData?.title || "Research Plan");
      const provider = createProvider();
      const msgs = buildPlanMessages({ title });
      const res = await provider.chat<PlanJSON>(msgs as any, { json: true, maxTokens: 900 });
      const parsed = (res.parsed as PlanJSON | undefined) ?? parsePlanLLM(res.rawText);
      if (!parsed) throw new Error("llm_plan_parse_failed");
      return { plan: parsed, _llm: { path: res.path, model: res.model, latencyMs: res.latencyMs } };
    },
  });

  const review = createStep({
    id: "review",
    description: "Suspend for human review",
    inputSchema: z.object({ plan: z.any() }),
    suspendSchema: z.object({ plan: z.any() }),
    resumeSchema: z.object({ review: z.string() }),
    outputSchema: z.object({ plan: z.any(), review: z.string() }),
    async execute({ inputData, suspend, resumeData }: any) {
      if (!resumeData?.review) {
        await suspend({ plan: inputData.plan });
        return { plan: inputData.plan, review: "" };
      }
      return { plan: inputData.plan, review: String(resumeData.review || "") };
    },
  });

  const finalize = createStep({
    id: "finalize",
    description: "Finalize the plan (optionally incorporate review)",
    inputSchema: z.object({ plan: z.any(), review: z.string().optional() }),
    outputSchema: z.object({ plan: z.any() }),
    async execute({ inputData }: any) {
      const plan = inputData.plan || {};
      const note = String(inputData.review || "").trim();
      const merged = note ? { ...plan, review_note: note } : plan;
      return { plan: merged };
    },
  });

  const workflow = createWorkflow({ id: "plan-workflow" })
    .then(draftPlan)
    .then(review)
    .then(finalize)
    .commit();

  const run = await workflow.createRunAsync();
  const result = await run.start({ inputData: input });
  const runId = (run as any)?.runId ?? undefined;
  return { run, runId, result };
}

export async function resumePlanMastraById(runId: string, resumeData: { review: string }) {
  const dynamicImport: any = (eval("import") as any);
  const mod: any = await dynamicImport("mastra").catch(() => null);
  if (!mod) throw new Error("Mastra not installed");
  const { createStep, createWorkflow } = mod as any;

  const draftPlan = createStep({ id: "draft-plan", inputSchema: z.object({}).passthrough(), outputSchema: z.object({ plan: z.any() }), async execute() { return { plan: {} }; } });
  const review = createStep({ id: "review", inputSchema: z.object({ plan: z.any() }), suspendSchema: z.object({ plan: z.any() }), resumeSchema: z.object({ review: z.string() }), outputSchema: z.object({ plan: z.any(), review: z.string() }), async execute({ inputData, suspend, resumeData }: any) { if (!resumeData?.review) { await suspend({ plan: inputData.plan }); return { plan: inputData.plan, review: "" }; } return { plan: inputData.plan, review: String(resumeData.review || "") }; } });
  const finalize = createStep({ id: "finalize", inputSchema: z.object({ plan: z.any(), review: z.string().optional() }), outputSchema: z.object({ plan: z.any() }), async execute({ inputData }: any) { const note = String(inputData.review || "").trim(); const merged = note ? { ...(inputData.plan || {}), review_note: note } : (inputData.plan || {}); return { plan: merged }; } });

  const workflow = createWorkflow({ id: "plan-workflow" }).then(draftPlan).then(review).then(finalize).commit();
  const run = await workflow.createRunAsync({ runId } as any).catch(() => null);
  if (!run) throw new Error("Unable to rehydrate Mastra run");
  const resumed = await run.resume({ resumeData });
  return resumed;
}

