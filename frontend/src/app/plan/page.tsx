"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatLayout from "@/ui/components/ChatLayout";
import { useSession } from "@/lib/supabase/session";
import { useProject } from "@/lib/project/context";
import ProjectPicker from "@/ui/components/ProjectPicker";

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

import { Button } from "@/ui/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/Tabs";
import { useToast } from "@/ui/components/Toast";

export default function PlanPage() {
  const { session } = useSession();
  const { projectId, setProjectId } = useProject();
  const { push } = useToast();

  // Tabs: editor | workflow | history
  const [tab, setTab] = useState<"editor" | "workflow" | "history">("editor");

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

  // Workflow state
  const [wfRunning, setWfRunning] = useState(false);
  const [wfRunId, setWfRunId] = useState<string | null>(null);
  const [wfDraft, setWfDraft] = useState<Plan | null>(null);
  const [wfReview, setWfReview] = useState("");
  const [wfLogs, setWfLogs] = useState<string[]>([]);
  const [wfDiff, setWfDiff] = useState<{ field: string; before: string; after: string }[]>([]);
  const [currentSection, setCurrentSection] = useState<keyof Plan | "title">("rq");

  async function loadLatest() {
    if (!projectId) return;
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

  useEffect(() => {
    if (projectId) {
      loadLatest();
      loadHistory();
    }
  }, [projectId]);

  // Default to workflow tab when redirected from Theme
  useEffect(() => {
    try {
      const key = "planDefaultTab";
      const v = typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
      if (v === "workflow") {
        setTab("workflow");
        window.sessionStorage.removeItem(key);
      }
    } catch {}
  }, []);

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
      setNote("Saved as new version (see History)");
      push({ title: "Saved", message: "Saved as new version" });
      await loadHistory();
    } catch (e: any) {
      const msg = e?.message || "failed to save plan";
      setError(msg);
      push({ title: "Save failed", message: msg });
    } finally {
      setSaving(false);
    }
  }

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
      push({ title: "Restored", message: "Version restored as a new draft" });
      await loadLatest();
      await loadHistory();
    } catch (e: any) {
      const msg2 = e?.message || "failed to restore";
      setError(msg2);
      push({ title: "Restore failed", message: msg2 });
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
        push({ title: "Regenerated", message: "Section regenerated and saved" });
        await loadHistory();
      }
    } catch (e: any) {
      const msg3 = e?.message || "failed to regenerate";
      setError(msg3);
      push({ title: "Regenerate failed", message: msg3 });
    }
  }

  async function startPlanWorkflow() {
    if (!projectId) return;
    setError(null);
    setNote(null);
    setWfRunning(true);
    setWfRunId(null);
    setWfDraft(null);
    setWfLogs([]);
    setWfDiff([]);
    try {
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ kind: "plan", input: { projectId, title: plan.title || "Research Plan" } }),
      });
      if (!res.ok || !res.body) throw new Error("failed to start workflow");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let suspended = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        for (const f of frames) {
          if (f.startsWith(":")) continue;
          if (!f.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(f.slice(6));
            if (msg.type === "started" && msg.runId) setWfRunId(msg.runId);
            if (msg.type === "review" && msg.plan) setWfDraft(msg.plan as Plan);
            if (msg.type === "progress" && typeof msg.message === "string") {
              setWfLogs((logs) => [msg.message, ...logs]);
              if (msg.message.startsWith("plan_workflow_error=")) setError(msg.message);
            }
            if (msg.type === "suspend") {
              setWfRunning(false);
              suspended = true;
            }
          } catch {}
        }
      }
      if (!suspended) setWfRunning(false);
      push({ title: "Workflow", message: suspended ? "Draft ready for review" : "Workflow finished" });
    } catch (e: any) {
      const msg4 = e?.message || "failed to start workflow";
      setError(msg4);
      push({ title: "Workflow error", message: msg4 });
      setWfRunning(false);
    }
  }

  async function submitReview() {
    if (!projectId || !wfRunId) return;
    try {
      const res = await fetch(`/api/runs/${wfRunId}/resume`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ answers: { review: wfReview } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed to resume");
      if (Array.isArray(json.diff)) setWfDiff(json.diff);
      if (json.plan) setPlan((p) => ({ ...p, ...(json.plan as any) }));
      setNote("Finalized via workflow. Saved as new version (see History)");
      push({ title: "Finalized", message: "Workflow changes applied" });
      setWfRunId(null);
      setWfDraft(null);
      setWfReview("");
      await loadHistory();
    } catch (e: any) {
      const msg5 = e?.message || "failed to resume";
      setError(msg5);
      push({ title: "Resume failed", message: msg5 });
    }
  }

  async function exportPlan(includeCitations: boolean) {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/export/plan?includeCitations=${includeCitations ? "1" : "0"}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!json?.ok || !json.markdown) throw new Error(json?.error || "failed to export");
      const blob = new Blob([json.markdown], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(plan?.title || "Research Plan").replace(/[^\w\-\s]/g, "_")}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setNote(includeCitations ? "Exported with citations" : "Exported markdown");
      push({ title: "Exported", message: includeCitations ? "Markdown with citations" : "Markdown only" });
    } catch (e: any) {
      const msg6 = e?.message || "failed to export";
      setError(msg6);
      push({ title: "Export failed", message: msg6 });
    }
  }

  // Editor tab content (full-width, stacked sections)
  const editorContent = (
    <div className="grid gap-4">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur rounded-md border border-white/15 px-3 py-2">
        <div className="text-sm text-foreground/80">Editor</div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" disabled={!projectId || saving} onClick={onSave as any}>{saving ? "Saving..." : "Save Plan"}</Button>
          <Button variant="secondary" size="xs" disabled={!projectId} onClick={() => exportPlan(false)}>Export Markdown</Button>
          <Button variant="secondary" size="xs" disabled={!projectId} onClick={() => exportPlan(true)}>Export + Citations</Button>
        </div>
      </div>
      <details className="rounded-md border border-white/15 px-3 py-2 text-sm" open={false}>
        <summary className="cursor-pointer text-foreground/80">Guidance</summary>
        <ul className="mt-2 grid gap-1 text-foreground/70">
          <li>• Keep Title and RQ concise and aligned.</li>
          <li>• Each section should be 3–6 sentences with clear claims.</li>
        </ul>
      </details>
      <form onSubmit={onSave} className="grid gap-5">
        <label className="grid gap-1">
          <span className="text-sm flex items-center justify-between gap-2">
            <span>Title</span>
            <Button type="button" size="xs" disabled={!projectId} onClick={() => regenerate("title")}>Regenerate</Button>
          </span>
          <input className="px-3 py-2 rounded-md border border-white/15 bg-black/30" value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} required aria-invalid={!!fieldErrors.title} />
          {fieldErrors.title && <span className="text-xs text-red-500">{fieldErrors.title}</span>}
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
            <span className="text-sm flex items-center justify-between gap-2">
              <span>{label}</span>
              <Button type="button" size="xs" disabled={!projectId} onClick={() => regenerate(k)}>Regenerate</Button>
            </span>
            <textarea className="px-3 py-2 rounded-md border border-white/15 bg-black/30 min-h-40" value={(plan as any)[k]} onChange={(e) => setPlan({ ...plan, [k]: e.target.value } as any)} required={k === "rq"} aria-invalid={k === "rq" && !!fieldErrors.rq} />
            {k === "rq" && fieldErrors.rq && <span className="text-xs text-red-500">{fieldErrors.rq}</span>}
          </label>
        ))}
        {note && <div className="text-sm text-foreground/70">{note}</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex gap-3">
          <Button type="submit" disabled={!projectId || saving} variant="primary" size="sm">{saving ? "Saving..." : "Save Plan"}</Button>
        </div>
      </form>
    </div>
  );

  // Workflow tab content (left)
  const workflowLeft = (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={!projectId || wfRunning}
          onClick={startPlanWorkflow}
          variant="primary"
          size="sm"
        >
          {wfRunning ? "Starting..." : "Generate Plan via Workflow (Review)"}
        </Button>
        {wfRunId && <span className="text-xs text-foreground/60">run: {wfRunId}</span>}
      </div>
      {wfDraft && (
        <div className="grid gap-2 rounded-lg border border-white/15 bg-black/30 p-3">
          <div className="text-base font-medium">Workflow Draft (Review)</div>
          <div className="text-sm"><span className="font-medium">Title:</span> {wfDraft.title}</div>
          <ul className="text-sm grid gap-1">
            <li><span className="font-medium">RQ:</span> {wfDraft.rq}</li>
            <li><span className="font-medium">Hypothesis:</span> {wfDraft.hypothesis}</li>
            <li><span className="font-medium">Data:</span> {wfDraft.data}</li>
            <li><span className="font-medium">Methods:</span> {wfDraft.methods}</li>
            <li><span className="font-medium">Identification:</span> {wfDraft.identification}</li>
            <li><span className="font-medium">Validation:</span> {wfDraft.validation}</li>
            <li><span className="font-medium">Ethics:</span> {wfDraft.ethics}</li>
          </ul>
          <textarea
            className="rounded-md border border-white/20 bg-transparent px-2 py-2 text-sm min-h-24"
            placeholder="Review comments or requested changes (optional)"
            value={wfReview}
            onChange={(e) => setWfReview(e.target.value)}
          />
          <div>
            <Button onClick={submitReview} disabled={!wfRunId} size="sm">Submit Review</Button>
          </div>
        </div>
      )}
      {note && <div className="text-sm text-foreground/70">{note}</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );

  // History tab content (left)
  const historyLeft = (
    <div className="grid gap-3">
      <div className="text-sm text-foreground/60">History</div>
      <div className="grid gap-2">
        {history.length === 0 && <div className="text-sm text-foreground/60">No history yet.</div>}
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between border border-white/15 rounded-md bg-black/30 px-3 py-2">
            <div className="text-sm text-foreground/80">{new Date(h.created_at).toLocaleString()} <span className="text-foreground/50">{h.status || "draft"}</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onRestore(h.id)} className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Restore</button>
              <button type="button" onClick={async () => { try { await loadHistory(); } catch {} }} className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Refresh</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Right panel only used in Workflow tab
  const workflowRight = useMemo(() => (
    <div className="grid gap-3">
      {wfLogs.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-white/15 bg-black/30 p-3">
          <div className="text-base font-medium">Workflow Logs</div>
          <ul className="text-sm grid gap-1">
            {wfLogs.map((l, i) => (
              <li key={i} className="text-foreground/70">• {l}</li>
            ))}
          </ul>
        </div>
      )}
      {wfDiff.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-white/15 bg-black/30 p-3">
          <div className="text-base font-medium">Changes Applied</div>
          <ul className="text-sm grid gap-2">
            {wfDiff.map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.field}</span>
                <div className="text-foreground/60 text-xs">Before: {d.before || <em>(empty)</em>}</div>
                <div className="text-foreground/80 text-xs">After: {d.after || <em>(empty)</em>}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ), [wfLogs, wfDiff]);

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Research Plan</h1>
        <ProjectPicker value={projectId} onChange={setProjectId} />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-3">
          <TabsTrigger value="editor" current={tab} onSelect={(v) => setTab(v as any)}>Editor</TabsTrigger>
          <TabsTrigger value="workflow" current={tab} onSelect={(v) => setTab(v as any)}>Workflow</TabsTrigger>
          <TabsTrigger value="history" current={tab} onSelect={(v) => setTab(v as any)}>History</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" current={tab}>
          <div className="grid gap-4">{editorContent}</div>
        </TabsContent>
        <TabsContent value="workflow" current={tab}>
          <ChatLayout left={workflowLeft} right={workflowRight} />
        </TabsContent>
        <TabsContent value="history" current={tab}>
          <div className="grid gap-4">{historyLeft}</div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
