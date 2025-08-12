import type { ThemeCandidate } from "@/agents/theme-finder";

export type DraftPlan = {
  title: string;
  rq: string;
  hypothesis: string;
  data: string;
  methods: string;
  identification: string;
  validation: string;
  ethics: string;
};

export type ResumeEvents =
  | { type: "started"; at: number; runId: string; selected?: ThemeCandidate | null }
  | { type: "progress"; message: string }
  | { type: "final"; plan: DraftPlan; selected?: ThemeCandidate | null };

export async function draftPlanFromSelection(
  selected: ThemeCandidate | null | undefined,
  emit: (e: ResumeEvents) => Promise<void> | void,
  runId: string
) {
  await emit({ type: "started", at: Date.now(), runId, selected: selected ?? null });
  await emit({ type: "progress", message: "compiling methods and outline..." });
  await new Promise((r) => setTimeout(r, 200));
  await emit({ type: "progress", message: "drafting research questions..." });
  await new Promise((r) => setTimeout(r, 200));

  const title = selected?.title || "Selected Theme";
  const plan: DraftPlan = {
    title,
    rq: `What is the impact/effect of ${title.toLowerCase()}?`,
    hypothesis: `We hypothesize ${title.toLowerCase()} yields measurable improvements with trade-offs.`,
    data: "Outline target datasets/sources (public stats, platform logs, paper corpora)",
    methods: "Candidate methods: descriptive, DiD, IV, synthetic control, ablation/robustness",
    identification: "Assumptions and threats; proxies; instruments; falsification checks",
    validation: "Holdout evaluation; sensitivity; placebo; external benchmark",
    ethics: "Bias, privacy, consent, misuse considerations; mitigation steps",
  };
  await emit({ type: "final", plan, selected: selected ?? null });
  return plan;
}

