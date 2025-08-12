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
  const mod: any = await import("mastra").catch(() => null);
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

  const themeWorkflow = createWorkflow({ id: "theme-workflow" })
    .then(findCandidates)
    .then(selectCandidate)
    .commit();

  const run = await themeWorkflow.createRunAsync();
  const result = await run.start({ inputData: input });
  return { run, result };
}

export async function resumeThemeMastra(run: any, resumeData: any) {
  const resumed = await run.resume({ resumeData });
  return resumed;
}

