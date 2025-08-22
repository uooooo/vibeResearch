"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/supabase/session";
import { useProject } from "@/lib/project/context";
import CandidateCompare from "@/ui/components/CandidateCompare";

type Candidate = { id: string; title: string; novelty: number; risk: number };
type EventMsg =
  | { type: "started"; at: number; input: unknown; runId?: string }
  | { type: "progress"; message: string }
  | { type: "candidates"; items: Candidate[]; runId?: string }
  | { type: "suspend"; reason: string; runId?: string };
type Plan = {
  title: string;
  rq: string;
  hypothesis: string;
  data: string;
  methods: string;
  identification: string;
  validation: string;
  ethics: string;
};

export default function ThemePage() {
  const { session } = useSession();
  const { projectId } = useProject();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  // projectId comes from global context
  const abortRef = useRef<AbortController | null>(null);

  async function startRun() {
    if (!projectId) {
      setLogs((l) => ["please select a project first", ...l]);
      return;
    }
    setRunning(true);
    setLogs([]);
    setCandidates([]);
    setPlan(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const res = await fetch("/api/runs/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ kind: "theme", input: { domain: "ai", keywords: "agentic research", projectId } }),
      signal: ac.signal,
    });
    if (!res.ok || !res.body) {
      setLogs((l) => ["error: failed to start run", ...l]);
      setRunning(false);
      return;
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
        if (part.startsWith(":")) continue; // comment
        if (!part.startsWith("data: ")) continue;
        const json = part.slice(6);
        try {
          const msg = JSON.parse(json) as EventMsg;
          if (msg.type === "started" && msg.runId) {
            // Prefer DB UUID runId over stub ids like "run_xxx"; don't overwrite a UUID once set.
            const rid: string = msg.runId; // narrow for TS within closure
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rid);
            setRunId((prev) => {
              if (!prev) return rid;
              const prevIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prev);
              if (prevIsUUID) return prev; // keep DB id
              return isUUID ? rid : prev; // upgrade to DB id if available
            });
          }
          if (msg.type === "progress") setLogs((l) => [msg.message, ...l]);
          if (msg.type === "candidates") setCandidates(msg.items);
          if (msg.type === "suspend") setRunning(false);
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  async function onSelectCandidate(c: Candidate) {
    if (!runId) return;
    setLogs((l) => [
      `resuming with candidate: ${c.title}`,
      ...l,
    ]);
    const res = await fetch(`/api/runs/${runId}/resume`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ answers: { selected: c } }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLogs((l) => [
        `resume error: ${data?.error || res.statusText}`,
        ...l,
      ]);
      return;
    }
    if (data?.llm?.path) {
      const msg = `llm_path=${data.llm.path}${data.llm.model ? ` model=${data.llm.model}` : ""}${
        data.llm.latencyMs ? ` latencyMs=${data.llm.latencyMs}` : ""
      }`;
      setLogs((l) => [msg, ...l]);
    }
    if (data?.plan) setPlan(data.plan as Plan);
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Theme Exploration</h1>
        <div className="flex items-center gap-3">
          {/* Global picker is in Header; just reflect current selection in button label */}
          <button
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          onClick={startRun}
          disabled={running}
        >
          {running ? "Running..." : (!projectId ? "Select project to start" : "Start run")}
          </button>
        </div>
      </div>
      {!projectId && (
        <div className="text-sm text-foreground/70">
          Select or create a project from the header to start a run. You can create one on the Projects page.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 grid gap-3">
          <h2 className="text-lg font-medium">Candidates</h2>
          <div className="grid gap-3">
            {candidates.length === 0 && <p className="text-foreground/60 text-sm">No candidates yet.</p>}
            {candidates.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/15 bg-black/30 p-3">
                <div className="font-medium mb-1">{c.title}</div>
                <div className="text-xs text-foreground/70">Novelty {(c.novelty * 100).toFixed(0)}% · Risk {(c.risk * 100).toFixed(0)}%</div>
                <div className="mt-2">
                  <button
                    className="rounded-md border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
                    onClick={() => onSelectCandidate(c)}
                    disabled={!runId}
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
          {candidates.length > 0 && (
            <div className="grid gap-2 mt-4">
              <div className="text-sm text-foreground/70">Compare</div>
              <CandidateCompare items={candidates} />
            </div>
          )}
          {plan && (
            <div className="grid gap-2 mt-4 rounded-lg border border-white/15 bg-black/30 p-3">
              <div className="text-base font-medium">Draft Research Plan</div>
              <div className="text-sm"><span className="font-medium">Title:</span> {plan.title}</div>
              <ul className="text-sm grid gap-1">
                <li><span className="font-medium">RQ:</span> {plan.rq}</li>
                <li><span className="font-medium">Hypothesis:</span> {plan.hypothesis}</li>
                <li><span className="font-medium">Data:</span> {plan.data}</li>
                <li><span className="font-medium">Methods:</span> {plan.methods}</li>
                <li><span className="font-medium">Identification:</span> {plan.identification}</li>
                <li><span className="font-medium">Validation:</span> {plan.validation}</li>
                <li><span className="font-medium">Ethics:</span> {plan.ethics}</li>
              </ul>
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <h2 className="text-lg font-medium">Logs</h2>
          <div className="rounded-lg border border-white/15 bg-black/30 p-3 min-h-32">
            <ul className="text-sm grid gap-2">
              {logs.map((line, i) => (
                <li key={i} className="text-foreground/70">• {line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
