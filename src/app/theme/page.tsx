"use client";
import { useEffect, useRef, useState } from "react";

type Candidate = { id: string; title: string; novelty: number; risk: number };
type EventMsg =
  | { type: "started"; at: number; input: unknown }
  | { type: "progress"; message: string }
  | { type: "candidates"; items: Candidate[] }
  | { type: "suspend"; reason: string };

export default function ThemePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function startRun() {
    setRunning(true);
    setLogs([]);
    setCandidates([]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const res = await fetch("/api/runs/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "theme", input: { domain: "ai", keywords: "agentic research" } }),
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
          if (msg.type === "progress") setLogs((l) => [msg.message, ...l]);
          if (msg.type === "candidates") setCandidates(msg.items);
          if (msg.type === "suspend") setRunning(false);
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Theme Exploration</h1>
        <button
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          onClick={startRun}
          disabled={running}
        >
          {running ? "Running..." : "Start run"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 grid gap-3">
          <h2 className="text-lg font-medium">Candidates</h2>
          <div className="grid gap-3">
            {candidates.length === 0 && <p className="text-foreground/60 text-sm">No candidates yet.</p>}
            {candidates.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/15 bg-black/30 p-3">
                <div className="font-medium mb-1">{c.title}</div>
                <div className="text-xs text-foreground/70">Novelty {(c.novelty * 100).toFixed(0)}% · Risk {(c.risk * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
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
