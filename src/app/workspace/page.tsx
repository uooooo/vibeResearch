"use client";
import { useMemo, useState } from "react";
import ChatLayout from "@/ui/components/ChatLayout";
import ChatInput from "@/ui/components/ChatInput";
import ChatMessage from "@/ui/components/ChatMessage";
import RightPanel from "@/ui/components/RightPanel";

type Msg = { id: string; role: "user" | "assistant" | "system" | "tool"; content: string };

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "assistant", content: "Hi! Share a domain/keywords to explore research themes." },
  ]);
  const [activity, setActivity] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  async function onSend(text: string) {
    const id = "u" + Date.now();
    setMessages((m) => [...m, { id, role: "user", content: text }]);
    setRunning(true);
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
          if (msg.type === "progress") setActivity((a) => [msg.message, ...a]);
          if (msg.type === "candidates") {
            assistantBuffer += `Top candidates (sample)\n`;
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

  const right = <RightPanel activity={<ul className="text-sm grid gap-2">{activity.map((l, i) => <li key={i}>• {l}</li>)}</ul>} />;

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <ChatLayout left={left} right={right} />
    </section>
  );
}

