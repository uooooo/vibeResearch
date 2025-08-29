"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/supabase/session";
import { useProject } from "@/lib/project/context";
import { useRouter } from "next/navigation";
import { Button, ActionButton } from "@/ui/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/ui/components/ui/Card";
import { ProgressSteps } from "@/ui/components/ui/ProgressBar";
import { useToast } from "@/ui/components/Toast";

type Evidence = { kind: 'scholar' | 'provider'; text: string };
type Candidate = {
  id: string;
  title: string;
  novelty: number;
  risk: number;
  feasibility?: number;
  summary?: string;
  evidence?: Evidence[];
};
type EventMsg =
  | { type: "started"; at: number; input: unknown; runId?: string }
  | { type: "progress"; message: string }
  | { type: "insights"; items: string[] }
  | { type: "candidates"; items: Candidate[]; runId?: string }
  | { type: "suspend"; reason: string; runId?: string };

type ThemePhase = "input" | "searching" | "analyzing" | "results" | "selected";

export default function ThemePage() {
  const { session } = useSession();
  const { projectId } = useProject();
  const router = useRouter();
  const { push } = useToast();
  
  // State
  const [phase, setPhase] = useState<ThemePhase>("input");
  const [logs, setLogs] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  
  // Form data
  const [domain, setDomain] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [freeQuery, setFreeQuery] = useState<string>("");
  const [deepProvider, setDeepProvider] = useState<string>("perplexity");
  const [topK, setTopK] = useState<number>(10);
  
  const abortRef = useRef<AbortController | null>(null);

  // Progress steps tracking
  const getProgressSteps = () => [
    {
      label: "Searching",
      status: phase === "searching" ? ("active" as const) : phase === "input" ? ("pending" as const) : ("completed" as const)
    },
    {
      label: "Analyzing",
      status: phase === "analyzing" ? ("active" as const) : ["input", "searching"].includes(phase) ? ("pending" as const) : ("completed" as const)
    },
    {
      label: "Results",
      status: phase === "results" ? ("active" as const) : ["input", "searching", "analyzing"].includes(phase) ? ("pending" as const) : ("completed" as const)
    }
  ];

  async function startRun() {
    if (!projectId) {
      push({ title: "Error", message: "Please select a project first" });
      return;
    }
    
    // Reset state
    setRunning(true);
    setPhase("searching");
    setLogs([]);
    setCandidates([]);
    setSelectedCandidate(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          kind: "theme",
          input: {
            domain: domain?.trim() || undefined,
            keywords: keywords?.trim() || undefined,
            query: freeQuery?.trim() || undefined,
            projectId,
            deepProvider: deepProvider || undefined,
            topK: Number.isFinite(topK) ? Math.max(1, Math.min(20, topK)) : undefined,
          },
        }),
        signal: ac.signal,
      });
      
      if (!res.ok || !res.body) {
        throw new Error("Failed to start theme generation");
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        
        for (const part of parts) {
          if (part.startsWith(":")) continue;
          if (!part.startsWith("data: ")) continue;
          const json = part.slice(6);
          
          try {
            const msg = JSON.parse(json) as EventMsg;
            
            if (msg.type === "started" && msg.runId) {
              const rid: string = msg.runId;
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rid);
              setRunId((prev) => {
                if (!prev) return rid;
                const prevIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prev);
                if (prevIsUUID) return prev;
                return isUUID ? rid : prev;
              });
            }
            
            if (msg.type === "progress") {
              setLogs((l) => [msg.message, ...l]);
              // Phase transition based on log content
              if (msg.message.includes("analyzing") || msg.message.includes("ranking")) {
                setPhase("analyzing");
              }
            }
            
            if (msg.type === "insights") {
              if (Array.isArray(msg.items)) setInsights(msg.items);
            }
            if (msg.type === "candidates") {
              setCandidates(msg.items);
              setPhase("results");
            }
            
            if (msg.type === "suspend") {
              setRunning(false);
            }
          } catch {}
        }
      }
    } catch (error: any) {
      setLogs((l) => [`Error: ${error.message}`, ...l]);
      push({ title: "Error", message: error.message });
      setRunning(false);
      setPhase("input");
    }
  }

  function handleCandidateSelect(c: Candidate) {
    setSelectedCandidate(c);
    setPhase("selected");
  }

  async function onContinueToPlan() {
    if (!runId || !selectedCandidate) return;
    
    try {
      setLogs((l) => [`Generating plan from: ${selectedCandidate.title}`, ...l]);
      push({ title: "Continuing", message: "Generating research plan..." });
      
      const res = await fetch(`/api/runs/${runId}/resume`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ answers: { selected: selectedCandidate } }),
      });
      
      const data = await res.json().catch(() => null);
      
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }
      
      if (data?.llm?.path) {
        const msg = `LLM: ${data.llm.path}${data.llm.model ? ` (${data.llm.model})` : ""}${
          data.llm.latencyMs ? ` - ${data.llm.latencyMs}ms` : ""
        }`;
        setLogs((l) => [msg, ...l]);
      }
      
      // Transition to Plan page
      try { window.sessionStorage.setItem('planDefaultTab', 'workflow'); } catch {}
      router.push("/plan");
      
    } catch (error: any) {
      setLogs((l) => [`Resume error: ${error.message}`, ...l]);
      push({ title: "Error", message: error.message });
    }
  }
  
  function resetToInput() {
    setPhase("input");
    setCandidates([]);
    setSelectedCandidate(null);
    setRunId(null);
    setLogs([]);
    abortRef.current?.abort();
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  // Input Station
  const inputStation = (
    <Card variant="elevated" size="md">
      <CardHeader>
        <CardTitle>Research Domain</CardTitle>
        <p className="text-sm text-foreground/70">Define your research interests to generate relevant theme candidates</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Domain <span className="text-foreground/50">(recommended)</span>
            </label>
            <input
              className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2.5 text-sm placeholder:text-foreground/40 focus:border-white/40 focus:outline-none"
              placeholder="e.g., economics, artificial intelligence, cryptocurrency"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={running}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Keywords <span className="text-foreground/50">(optional)</span>
            </label>
            <input
              className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2.5 text-sm placeholder:text-foreground/40 focus:border-white/40 focus:outline-none"
              placeholder="machine learning, decentralized finance, behavioral economics"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={running}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Free Query <span className="text-foreground/50">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2.5 text-sm placeholder:text-foreground/40 focus:border-white/40 focus:outline-none min-h-[80px] resize-none"
              placeholder="Describe any specific research directions or questions you're interested in exploring..."
              value={freeQuery}
              onChange={(e) => setFreeQuery(e.target.value)}
              disabled={running}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Deep Research Provider</label>
              <select
                className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2.5 text-sm focus:border-white/40 focus:outline-none"
                value={deepProvider}
                onChange={(e) => setDeepProvider(e.target.value)}
                disabled={running}
              >
                <option value="perplexity">Perplexity (Sonar)</option>
                <option value="openai">OpenAI (planned)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Top K Candidates (1–20)</label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2.5 text-sm focus:border-white/40 focus:outline-none"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value) || 10)}
                disabled={running}
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <ActionButton
          action="primary"
          size="lg"
          onClick={startRun}
          disabled={running || !projectId || (!domain.trim() && !keywords.trim() && !freeQuery.trim())}
          loading={running}
          className="w-full"
        >
          {!projectId ? "Select Project to Continue" : "Generate Theme Candidates"}
        </ActionButton>
      </CardFooter>
    </Card>
  );

  // Progress Theater
  const progressTheater = (
    <Card variant="default" size="md">
      <CardHeader>
        <CardTitle>Generation Progress</CardTitle>
        <ProgressSteps steps={getProgressSteps()} className="mt-3" />
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {logs.slice(0, 8).map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                <span className="text-foreground/70">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/50">Ready to generate candidates...</p>
        )}
        {insights.length > 0 && (
          <div className="mt-3 rounded-md border border-white/15 bg-black/30 p-3">
            <div className="text-sm font-medium mb-1">Insights</div>
            <ul className="text-sm text-foreground/80 grid gap-1">
              {insights.slice(0, 4).map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const leftPanel = (
    <div className="grid gap-6">
      {phase === "input" ? inputStation : progressTheater}
      {phase !== "input" && phase !== "results" && phase !== "selected" && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={resetToInput} disabled={running}>
            ← Back to Input
          </Button>
        </div>
      )}
    </div>
  );

  // Candidate Comparison
  const candidateComparison = (
    <Card variant="elevated" size="md">
      <CardHeader>
        <CardTitle>Theme Candidates</CardTitle>
        <p className="text-sm text-foreground/70">Compare potential research themes and select one to develop</p>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <div className="text-center py-8 text-foreground/50">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 6V14M6 10H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p>Waiting for candidates...</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {candidates.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedCandidate?.id === c.id
                    ? "border-white/40 bg-white/10"
                    : "border-white/15 bg-black/20 hover:bg-black/30 hover:border-white/25"
                }`}
                onClick={() => handleCandidateSelect(c)}
              >
                <div className="mb-3">
                  <h4 className="font-medium text-foreground mb-2 leading-tight">{c.title}</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-foreground/70">Novelty {(c.novelty * 100).toFixed(0)}%</span>
                    </div>
                    {typeof c.feasibility === 'number' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-foreground/70">Feasibility {(c.feasibility * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-foreground/70">Risk {(c.risk * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {c.summary && (
                    <p className="mt-2 text-sm text-foreground/70 line-clamp-3">{c.summary}</p>
                  )}
                  {Array.isArray(c.evidence) && c.evidence.length > 0 && (
                    <div className="mt-2 text-xs text-foreground/70">
                      <div className="font-medium text-foreground/80 mb-1">Evidence</div>
                      <ul className="grid gap-1">
                        {c.evidence.slice(0, 3).map((e, i) => (
                          <li key={i}>• {e.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {selectedCandidate?.id === c.id && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Selected candidate
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Action Center
  const actionCenter = (selectedCandidate || selectedCount > 0) && phase === "selected" ? (
    <Card variant="outline" size="md">
      <CardHeader>
        <CardTitle>Next Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {selectedCandidate && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-sm font-medium text-green-200 mb-1">Selected Theme</div>
              <div className="text-sm text-foreground/90">{selectedCandidate.title}</div>
            </div>
          )}
          {selectedCount > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-foreground/90">
              Batch selection: {selectedCount} item(s)
            </div>
          )}
          <div className="text-sm text-foreground/70">
            Continue to generate a detailed research plan based on your selected theme.
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" size="md" onClick={() => setSelectedCandidate(null)}>Change Selection</Button>
          {selectedCount > 0 ? (
            <ActionButton action="primary" size="md" onClick={saveSelectionAndContinue} className="flex-1">
              Continue to Plan ({selectedCount}) →
            </ActionButton>
          ) : (
            <ActionButton action="primary" size="md" onClick={onContinueToPlan} className="flex-1">
              Continue to Plan →
            </ActionButton>
          )}
        </div>
      </CardFooter>
    </Card>
  ) : null;

  const rightPanel = (
    <div className="grid gap-6">
      {phase === "input" && (
        <Card variant="default" size="md">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-foreground/60">Define your research domain to see theme candidates</p>
          </CardContent>
        </Card>
      )}
      
      {(phase === "results" || phase === "selected") && candidateComparison}
      {actionCenter}
      
      {(phase === "searching" || phase === "analyzing") && (
        <Card variant="default" size="md">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <p className="text-foreground/60">Generating candidates...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Enhanced ChatLayout
  const layout = (
    <div className="grid grid-cols-1 lg:grid-cols-[460px_minmax(0,1fr)] gap-8">
      <div>{leftPanel}</div>
      <div>{rightPanel}</div>
    </div>
  );

  return (
    <section className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Theme Exploration</h1>
            <p className="text-foreground/70">Discover relevant research themes tailored to your interests</p>
          </div>
          {(phase === "results" || phase === "selected") && (
            <Button variant="ghost" size="sm" onClick={resetToInput}>
              ← New Search
            </Button>
          )}
        </div>
      </div>
      {layout}
    </section>
  );
}
