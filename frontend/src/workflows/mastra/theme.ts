// Mastra integration (prep): dynamic import to avoid hard build dependency
// Uses patterns from Mastra docs (Context7) for suspend/resume.
import { z } from "zod";

export type ThemeStartInput = {
  query?: string;
  domain?: string;
  keywords?: string;
  projectId?: string;
};

export async function startThemeMastra(input: ThemeStartInput) {
  // Avoid static import to keep Turbopack from crawling native deps
  const dynamicImport: any = (eval("import") as any);
  const mod: any = await dynamicImport("mastra").catch(() => null);
  if (!mod) throw new Error("Mastra not installed");
  const { createStep, createWorkflow } = mod as any;

  const findCandidates = createStep({
    id: "find-candidates",
    description: "Generate theme candidates",
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ candidates: z.array(z.object({ id: z.string(), title: z.string(), novelty: z.number(), risk: z.number() })) }),
    async execute() {
      const items = [
        { id: "t1", title: "Impact of LLM adoption on SME productivity", novelty: 0.7, risk: 0.3 },
        { id: "t2", title: "Stablecoin shocks and DeFi liquidity", novelty: 0.8, risk: 0.5 },
        { id: "t3", title: "RLHF data leakage in academic benchmarks", novelty: 0.6, risk: 0.4 },
      ];
      return { candidates: items };
    },
  });

  const selectCandidate = createStep({
    id: "select-candidate",
    description: "Human selects candidate",
    inputSchema: z.object({ candidates: z.array(z.any()) }),
    resumeSchema: z.object({ selected: z.object({ id: z.string(), title: z.string() }) }),
    suspendSchema: z.object({ candidates: z.array(z.any()) }),
    outputSchema: z.object({ selection: z.object({ id: z.string(), title: z.string() }) }),
    async execute({ inputData, resumeData, suspend }: any) {
      if (!resumeData?.selected) {
        await suspend({ candidates: inputData.candidates });
        return { selection: { id: "", title: "" } };
      }
      return { selection: resumeData.selected };
    },
  });

  const draftPlan = createStep({
    id: "draft-plan",
    description: "Draft research plan from selection",
    inputSchema: z.object({ selection: z.object({ id: z.string(), title: z.string() }) }),
    outputSchema: z.object({ plan: z.object({
      title: z.string(), rq: z.string(), hypothesis: z.string(), data: z.string(), methods: z.string(), identification: z.string(), validation: z.string(), ethics: z.string()
    }) }),
    async execute({ inputData }: any) {
      const title = inputData.selection.title;
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
      return { plan };
    },
  });

  const themeWorkflow = createWorkflow({ id: "theme-workflow" })
    .then(findCandidates)
    .then(selectCandidate)
    .then(draftPlan)
    .commit();

  const run = await themeWorkflow.createRunAsync();
  const result = await run.start({ inputData: input });
  const runId = (run as any)?.runId ?? undefined;
  return { run, runId, result };
}

export async function resumeThemeMastraById(runId: string, resumeData: any) {
  const dynamicImport: any = (eval("import") as any);
  const mod: any = await dynamicImport("mastra").catch(() => null);
  if (!mod) throw new Error("Mastra not installed");
  const { createStep, createWorkflow } = mod as any;
  // Recreate the same workflow definition
  const findCandidates = createStep({ id: "find-candidates", inputSchema: z.object({}).passthrough(), outputSchema: z.object({ candidates: z.array(z.any()) }), async execute() { return { candidates: [] }; } });
  const selectCandidate = createStep({ id: "select-candidate", inputSchema: z.object({ candidates: z.array(z.any()) }), resumeSchema: z.object({ selected: z.object({ id: z.string(), title: z.string() }) }), suspendSchema: z.object({ candidates: z.array(z.any()) }), outputSchema: z.object({ selection: z.object({ id: z.string(), title: z.string() }) }), async execute({ inputData, resumeData, suspend }: any) { if (!resumeData?.selected) { await suspend({ candidates: inputData.candidates }); return { selection: { id: "", title: "" } }; } return { selection: resumeData.selected }; } });
  const draftPlan = createStep({ id: "draft-plan", inputSchema: z.object({ selection: z.object({ id: z.string(), title: z.string() }) }), outputSchema: z.object({ plan: z.any() }), async execute({ inputData }: any) { return { plan: { title: inputData.selection.title } }; } });
  const themeWorkflow = createWorkflow({ id: "theme-workflow" }).then(findCandidates).then(selectCandidate).then(draftPlan).commit();
  // Create a run handle from existing runId if supported
  const run = await themeWorkflow.createRunAsync({ runId } as any).catch(() => null);
  if (!run) throw new Error("Unable to rehydrate Mastra run");
  const resumed = await run.resume({ resumeData });
  return resumed;
}
