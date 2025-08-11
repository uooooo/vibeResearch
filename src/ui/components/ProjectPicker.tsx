"use client";
import { useEffect, useState } from "react";

type Project = { id: string; title: string; domain?: string };

export default function ProjectPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [items, setItems] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!cancelled) {
          if (data?.ok) setItems(data.items ?? []);
          else setError(data?.error || "failed to load projects");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !items) return <div className="text-xs text-foreground/60">Loading projects…</div>;
  if (error) return <div className="text-xs text-red-500">{error}</div>;
  if (!items || items.length === 0)
    return <div className="text-xs text-foreground/60">No projects (or Supabase not configured)</div>;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-foreground/70">Project</span>
      <select
        className="bg-transparent border border-white/15 rounded-md px-2 py-1"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">—</option>
        {items.map((p) => (
          <option key={p.id} value={p.id} className="bg-black">
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}

