import type { ThemeCandidate } from "@/agents/theme-finder";

export type DraftPlan = {
  title: string;
  background: string;
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
  
  // Generate background from theme evidence
  const generateBackground = (candidate: ThemeCandidate | null | undefined): string => {
    if (!candidate) return "";
    
    const lines: string[] = [];
    lines.push('# Background / Prior Work\n');
    lines.push('*Generated from selected theme research*\n');
    lines.push(`\n## ${candidate.title}`);
    
    // Add summary if available
    if (candidate.summary) {
      lines.push(`\n${candidate.summary.trim()}`);
    }
    
    // Add evidence bullets
    const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
    if (evidence.length > 0) {
      lines.push('\n### Evidence');
      const bullets = evidence.slice(0, 8).map((e: any) => {
        const text = String(e?.text || '').trim();
        const kind = e?.kind === 'scholar' ? '[Scholar]' : e?.kind === 'provider' ? '[Research]' : '';
        return text ? `- ${kind} ${text}` : '';
      }).filter(Boolean);
      if (bullets.length) lines.push(bullets.join('\n'));
    }
    
    // Add metrics if available
    const metrics: string[] = [];
    if (typeof candidate.novelty === 'number') metrics.push(`Novelty: ${(candidate.novelty * 100).toFixed(0)}%`);
    if (typeof candidate.feasibility === 'number') metrics.push(`Feasibility: ${(candidate.feasibility * 100).toFixed(0)}%`);
    if (typeof candidate.risk === 'number') metrics.push(`Risk: ${(candidate.risk * 100).toFixed(0)}%`);
    if (metrics.length) {
      lines.push(`\n*${metrics.join(' • ')}*`);
    }
    
    return lines.join('\n');
  };
  
  const plan: DraftPlan = {
    title,
    background: generateBackground(selected),
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

