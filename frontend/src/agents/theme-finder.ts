export type ThemeFinderInput = {
  query?: string;
  domain?: string;
  keywords?: string;
  projectId?: string;
};

export type Evidence = { kind: 'scholar' | 'provider'; text: string };

export type ThemeCandidate = {
  id: string;
  title: string;
  novelty: number;
  risk: number;
  feasibility?: number;
  summary?: string;
  evidence?: Evidence[];
};

export type ThemeFinderEvents =
  | { type: "started"; at: number; input: ThemeFinderInput; runId: string }
  | { type: "progress"; message: string }
  | { type: "candidates"; items: ThemeCandidate[]; runId: string }
  | { type: "suspend"; reason: "select_candidate"; runId: string };

export class ThemeFinderAgent {
  // In the future, replace internals with Mastra agent and .suspend()
  constructor(private readonly opts: { maxSteps?: number } = {}) {}

  async run(input: ThemeFinderInput, emit: (e: ThemeFinderEvents) => Promise<void> | void) {
    const runId = `run_${Math.random().toString(36).slice(2, 9)}`;
    await emit({ type: "started", at: Date.now(), input, runId });
    await emit({ type: "progress", message: "fetching papers..." });
    await new Promise((r) => setTimeout(r, 200));
    await emit({ type: "progress", message: "ranking candidates..." });
    await new Promise((r) => setTimeout(r, 250));
    const candidates: ThemeCandidate[] = [
      { id: "t1", title: "Impact of LLM adoption on SME productivity", novelty: 0.7, risk: 0.3 },
      { id: "t2", title: "Stablecoin shocks and DeFi liquidity", novelty: 0.8, risk: 0.5 },
      { id: "t3", title: "RLHF data leakage in academic benchmarks", novelty: 0.6, risk: 0.4 },
    ];
    await emit({ type: "candidates", items: candidates, runId });
    await emit({ type: "suspend", reason: "select_candidate", runId });
    return { runId, candidates };
  }
}

