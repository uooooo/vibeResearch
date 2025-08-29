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

import ChatLayout from "@/ui/components/ChatLayout";

import { useRouter } from "next/navigation";

import { Button } from "@/ui/components/ui/Button";

export default function ThemePage() {
  const { session } = useSession();
  const { projectId } = useProject();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [freeQuery, setFreeQuery] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  async function startRun() {
    if (!projectId) {
      setLogs((l) => ["please select a project first", ...l]);
      return;
    }
    setRunning(true);
    setLogs([]);
    setCandidates([]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

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
        },
      }),
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
            const rid: string = msg.runId;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rid);
            setRunId((prev) => {
              if (!prev) return rid;
              const prevIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prev);
              if (prevIsUUID) return prev;
              return isUUID ? rid : prev;
            });
          }
          if (msg.type === "progress") setLogs((l) => [msg.message, ...l]);
          if (msg.type === "candidates") setCandidates(msg.items);
          if (msg.type === "suspend") setRunning(false);
        } catch {}
      }
    }
  }

  async function onSelectCandidate(c: Candidate) {
    if (!runId) return;
    setLogs((l) => [`resuming with candidate: ${c.title}`, ...l]);
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
      setLogs((l) => [`resume error: ${data?.error || res.statusText}`, ...l]);
      return;
    }
    if (data?.llm?.path) {
      const msg = `llm_path=${data.llm.path}${data.llm.model ? ` model=${data.llm.model}` : ""}${
        data.llm.latencyMs ? ` latencyMs=${data.llm.latencyMs}` : ""
      }`;
      setLogs((l) => [msg, ...l]);
    }
    // After selection and resume, move to Plan editor (plan persisted server-side)
    try { window.sessionStorage.setItem('planDefaultTab', 'workflow'); } catch {}
    router.push("/plan");
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  const left = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <input
          className="rounded-md border border-white/20 bg-transparent px-2 py-2 text-sm"
          placeholder="Domain (e.g., economics, ai, crypto)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <input
          className="rounded-md border border-white/20 bg-transparent px-2 py-2 text-sm"
          placeholder="Keywords (comma separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <input
          className="rounded-md border border-white/20 bg-transparent px-2 py-2 text-sm"
          placeholder="Free query (optional)"
          value={freeQuery}
          onChange={(e) => setFreeQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-2 rounded-lg border border-white/15 bg-black/30 p-3">
        <div className="text-base font-medium">Progress</div>
        <ul className="text-sm grid gap-1">
          {logs.map((line, i) => (
            <li key={i} className="text-foreground/70">• {line}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const right = (
    <div className="grid gap-3">
      <div className="text-sm text-foreground/60">Candidates</div>
      {candidates.length === 0 && (
        <div className="text-sm text-foreground/60">No candidates yet.</div>
      )}
      <div className="grid gap-2">
        {candidates.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/15 bg-black/30 p-3">
            <div className="font-medium mb-1">{c.title}</div>
            <div className="text-xs text-foreground/70">Novelty {(c.novelty * 100).toFixed(0)}% · Risk {(c.risk * 100).toFixed(0)}%</div>
            <div className="mt-2">
              <button
                onClick={() => onSelectCandidate(c)}
                disabled={!runId}
                className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
              >
                Continue to Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Theme Exploration</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={startRun} disabled={running || !projectId}>
            {running ? "Running..." : (!projectId ? "Select project to start" : "Generate Theme Candidates")}
          </Button>
        </div>
      </div>
      <ChatLayout left={left} right={right} />
    </section>
  );
}
