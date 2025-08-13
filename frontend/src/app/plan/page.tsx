"use client";
import { useEffect, useState } from "react";
import ProjectPicker from "@/ui/components/ProjectPicker";
import { useSession } from "@/lib/supabase/session";

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

export default function PlanPage() {
  const { session } = useSession();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>({
    title: "",
    rq: "",
    hypothesis: "",
    data: "",
    methods: "",
    identification: "",
    validation: "",
    ethics: "",
  });

  async function loadLatest() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans?projectId=${projectId}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed to load plan");
      const content = json.item?.content || null;
      if (content) setPlan((p) => ({ ...p, ...content }));
      else setNote("No saved plan yet — draft your plan below.");
    } catch (e: any) {
      setError(e?.message || "failed to load plan");
    } finally {
      setLoading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ projectId, title: plan.title || "Research Plan", status: "draft", content: plan }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed to save plan");
      setNote("Saved");
    } catch (e: any) {
      setError(e?.message || "failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (projectId) loadLatest();
  }, [projectId]);

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Research Plan</h1>
        <ProjectPicker value={projectId} onChange={setProjectId} />
      </div>
      {note && <div className="text-sm text-foreground/70">{note}</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      <form onSubmit={onSave} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm">Title</span>
          <input className="px-3 py-2 rounded-md border border-white/15 bg-black/30" value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} required />
        </label>
        {([
          ["rq", "Research Question"],
          ["hypothesis", "Hypothesis"],
          ["data", "Data"],
          ["methods", "Methods"],
          ["identification", "Identification"],
          ["validation", "Validation"],
          ["ethics", "Ethics"],
        ] as const).map(([k, label]) => (
          <label key={k} className="grid gap-1">
            <span className="text-sm">{label}</span>
            <textarea className="px-3 py-2 rounded-md border border-white/15 bg-black/30 min-h-24" value={(plan as any)[k]} onChange={(e) => setPlan({ ...plan, [k]: e.target.value } as any)} />
          </label>
        ))}
        <div className="flex gap-3">
          <button type="submit" disabled={!projectId || saving} className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
            {saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </form>
    </section>
  );
}

