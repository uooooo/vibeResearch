"use client";
import { useMemo, useState } from "react";

export type Candidate = { id: string; title: string; novelty?: number; risk?: number };
type SortKey = "novelty" | "risk" | "title";

export default function CandidateCompare({ items }: { items: Candidate[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("novelty");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const av = (a as any)[sortBy] ?? (sortBy === "title" ? a.title : 0);
      const bv = (b as any)[sortBy] ?? (sortBy === "title" ? b.title : 0);
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
    return arr;
  }, [items, sortBy, desc]);

  function Bar({ value, color }: { value: number; color: string }) {
    const pct = Math.max(0, Math.min(1, value));
    return (
      <div className="w-full h-2 bg-white/10 rounded">
        <div className="h-2 rounded" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    );
  }

  function HeaderCell({ k, label }: { k: SortKey; label: string }) {
    const active = sortBy === k;
    return (
      <button
        type="button"
        onClick={() => (active ? setDesc(!desc) : (setSortBy(k), setDesc(true)))}
        className={`text-left px-3 py-2 text-xs ${active ? "text-white" : "text-foreground/70"}`}
      >
        {label} {active ? (desc ? "▼" : "▲") : ""}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/15 bg-black/30 overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] items-center border-b border-white/10">
        <div className="px-3 py-2 text-xs font-medium">Title</div>
        <HeaderCell k="novelty" label="Novelty" />
        <HeaderCell k="risk" label="Risk" />
      </div>
      <ul className="divide-y divide-white/10">
        {sorted.map((c) => (
          <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-3 px-3 py-2">
            <div className="text-sm truncate" title={c.title}>{c.title}</div>
            <div className="flex items-center gap-2">
              <span className="w-10 text-xs tabular-nums">{((c.novelty ?? 0) * 100).toFixed(0)}%</span>
              <Bar value={c.novelty ?? 0} color="#22c55e" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 text-xs tabular-nums">{((c.risk ?? 0) * 100).toFixed(0)}%</span>
              <Bar value={c.risk ?? 0} color="#ef4444" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

