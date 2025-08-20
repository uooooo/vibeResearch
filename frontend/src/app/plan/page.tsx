"use client";
import { useEffect, useState } from "react";
import ProjectPicker from "@/ui/components/ProjectPicker";
import { useSession } from "@/lib/supabase/session";
import { useProject } from "@/lib/project/context";

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
  const { projectId, setProjectId } = useProject();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; rq?: string }>({});
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
  const [history, setHistory] = useState<{ id: string; created_at: string; title?: string; status?: string }[]>([]);

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

  async function loadHistory() {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/plans/history?projectId=${projectId}&limit=10`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) setHistory(json.items || []);
    } catch {}
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const errs: { title?: string; rq?: string } = {};
    if (!plan.title?.trim()) errs.title = "Title is required";
    if (!plan.rq?.trim()) errs.rq = "Research Question is required";
    if (errs.title || errs.rq) {
      setFieldErrors(errs);
      setSaving(false);
      return;
    }
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
      await loadHistory();
    } catch (e: any) {
      setError(e?.message || "failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (projectId) {
      loadLatest();
      loadHistory();
    }
  }, [projectId]);

  async function onRestore(id: string) {
    if (!confirm("Restore this version as a new draft?")) return;
    try {
      const res = await fetch(`/api/plans/restore`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ planId: id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed to restore");
      setNote("Restored as a new draft");
      await loadLatest();
      await loadHistory();
    } catch (e: any) {
      setError(e?.message || "failed to restore");
    }
  }

  async function regenerate(section: keyof Plan | "title") {
    if (!projectId) return;
    try {
      setNote(null);
      const res = await fetch(`/api/plans/regenerate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ projectId, section, content: (plan as any)[section] }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed to regenerate");
      const content = json.item?.content || null;
      if (content) {
        setPlan((p) => ({ ...p, ...content }));
        setNote("Regenerated and saved as new version");
        await loadHistory();
      }
    } catch (e: any) {
      setError(e?.message || "failed to regenerate");
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Research Plan</h1>
        <ProjectPicker value={projectId} onChange={setProjectId} />
      </div>
      {note && <div className="text-sm text-foreground/70">{note}</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      <form onSubmit={onSave} className="grid gap-4 md:grid-cols-3 md:items-start">
        <label className="grid gap-1">
          <span className="text-sm flex items-center gap-2">Title
            <button type="button" disabled={!projectId} onClick={() => regenerate("title")} className="rounded-md border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10">Regenerate</button>
          </span>
          <input className="px-3 py-2 rounded-md border border-white/15 bg-black/30" value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} required aria-invalid={!!fieldErrors.title} />
          {fieldErrors.title && <span className="text-xs text-red-500">{fieldErrors.title}</span>}
        </label>
        <div className="md:col-span-2 grid gap-4">
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
            <span className="text-sm flex items-center gap-2">{label}
              <button type="button" disabled={!projectId} onClick={() => regenerate(k)} className="rounded-md border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10">Regenerate</button>
            </span>
            <textarea className="px-3 py-2 rounded-md border border-white/15 bg-black/30 min-h-24" value={(plan as any)[k]} onChange={(e) => setPlan({ ...plan, [k]: e.target.value } as any)} required={k === "rq"} aria-invalid={k === "rq" && !!fieldErrors.rq} />
            {k === "rq" && fieldErrors.rq && <span className="text-xs text-red-500">{fieldErrors.rq}</span>}
          </label>
        ))}
        <div className="flex gap-3"><button type="submit" disabled={!projectId || saving} className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10">{saving ? "Saving..." : "Save Plan"}</button></div>
        </div>
        <div className="md:col-span-3 grid gap-3">
          <div className="text-sm text-foreground/70">History</div>
          <div className="grid gap-2">
            {history.length === 0 && <div className="text-sm text-foreground/60">No history yet.</div>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border border-white/15 rounded-md bg-black/30 px-3 py-2">
                <div className="text-sm text-foreground/80">{new Date(h.created_at).toLocaleString()} <span className="text-foreground/50">{h.status || "draft"}</span></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onRestore(h.id)} className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Restore</button>
                  <button type="button" onClick={async () => {
                    try {
                      const res = await fetch(`/api/plans/history?projectId=${projectId}&limit=1`, { cache: 'no-store' });
                      setPlan((p) => ({ ...p }));
                    } catch {}
                  }} className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Refresh</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
