"use client";
import { useMemo, useState } from "react";
import ChatLayout from "@/ui/components/ChatLayout";
import ChatInput from "@/ui/components/ChatInput";
import ChatMessage from "@/ui/components/ChatMessage";
import RightPanel from "@/ui/components/RightPanel";

type Msg = { id: string; role: "user" | "assistant" | "system" | "tool"; content: string };
type Candidate = { id: string; title: string; novelty?: number; risk?: number };

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "assistant", content: "Hi! Share a domain/keywords to explore research themes." },
  ]);
  const [activity, setActivity] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  async function onSend(text: string) {
    const id = "u" + Date.now();
    setMessages((m) => [...m, { id, role: "user", content: text }]);
    setRunning(true);
    setCandidates([]);
    setRunId(null);
    const res = await fetch("/api/runs/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "theme", input: { query: text } }),
    });
    if (!res.ok || !res.body) {
      setActivity((a) => ["error: failed to start run", ...a]);
      setRunning(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantBuffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const f of frames) {
        if (f.startsWith(":")) continue;
        if (!f.startsWith("data: ")) continue;
        const json = f.slice(6);
        try {
          const msg = JSON.parse(json) as any;
          if (msg.type === "started" && msg.runId) setRunId(msg.runId);
          if (msg.type === "progress") setActivity((a) => [msg.message, ...a]);
          if (msg.type === "candidates") {
            assistantBuffer += `Top candidates (sample)\n`;
            setCandidates(msg.items || []);
            for (const c of msg.items) assistantBuffer += `• ${c.title}\n`;
          }
          if (msg.type === "suspend") {
            setMessages((m) => [...m, { id: "a" + Date.now(), role: "assistant", content: assistantBuffer || "Done." }]);
            assistantBuffer = "";
            setRunning(false);
          }
        } catch {}
      }
    }
  }

  async function onSelectCandidate(c: Candidate) {
    if (!runId) return;
    setActivity((a) => [
      `resuming with candidate: ${c.title}`,
      ...a,
    ]);
    const res = await fetch(`/api/runs/${runId}/resume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: { selected: c } }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setActivity((a) => [
        `resume error: ${data?.error || res.statusText}`,
        ...a,
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      { id: "a" + Date.now(), role: "assistant", content: `Acknowledged. Proceeding with: "${c.title}"\nStatus: ${data?.status}` },
    ]);
    // Clear candidates after selection
    setCandidates([]);
  }

  const left = useMemo(
    () => (
      <div className="grid gap-4">
        <div className="grid gap-3">
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
        </div>
        <ChatInput onSend={onSend} />
        {running && <div className="text-xs text-foreground/60">Running…</div>}
      </div>
    ),
    [messages, running]
  );

  const lastAssistant = useMemo(() => {
    const as = messages.filter((m) => m.role === "assistant");
    return as.length ? as[as.length - 1].content : "";
  }, [messages]);

  const right = (
    <RightPanel
      output={
        candidates.length ? (
          <div className="grid gap-3">
            <div className="text-sm text-foreground/80">Select a candidate to continue:</div>
            <ul className="grid gap-2">
              {candidates.map((c) => (
                <li key={c.id} className="border border-white/15 rounded-lg p-3 bg-black/30">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => onSelectCandidate(c)} className="px-3 py-1 text-sm rounded-md border border-white/20 hover:bg-white/10">Select</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : lastAssistant ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{lastAssistant}</div>
        ) : (
          <div className="text-sm text-foreground/60">No output yet.</div>
        )
      }
      activity={<ul className="text-sm grid gap-2">{activity.map((l, i) => <li key={i}>• {l}</li>)}</ul>}
      thinking={<div className="text-sm text-foreground/60">Reserved for agent thinking.</div>}
    />
  );

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <ChatLayout left={left} right={right} />
    </section>
  );
}
