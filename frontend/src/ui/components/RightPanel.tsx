"use client";
import { useState } from "react";

export default function RightPanel({ output, activity, thinking }: { output?: React.ReactNode; activity?: React.ReactNode; thinking?: React.ReactNode }) {
  const [tab, setTab] = useState<"output" | "activity" | "thinking">("output");
  const tabs: { key: typeof tab; label: string }[] = [
    { key: "output", label: "Output" },
    { key: "activity", label: "Activity" },
    { key: "thinking", label: "Thinking" },
  ];
  return (
    <aside className="border-l border-white/10 pl-4">
      <div className="flex items-center gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 rounded-md text-sm border ${tab === t.key ? "bg-white/10 border-white/20" : "border-white/10 hover:bg-white/5"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[300px]">
        {tab === "output" && (output || <div className="text-sm text-foreground/60">No output yet.</div>)}
        {tab === "activity" && (activity || <div className="text-sm text-foreground/60">No activity yet.</div>)}
        {tab === "thinking" && (thinking || <div className="text-sm text-foreground/60">No thinking yet.</div>)}
      </div>
    </aside>
  );
}

