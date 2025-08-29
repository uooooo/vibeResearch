"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/supabase/session";
import { useProject } from "@/lib/project/context";
import { useToast } from "@/ui/components/Toast";
import { Button, ActionButton } from "@/ui/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/ui/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/Tabs";
import { ProgressSteps } from "@/ui/components/ui/ProgressBar";

type Plan = {
  title: string;
  rq: string;
  hypothesis: string;
  data: string;
  methods: string;
  identification: string;
  validation: string;
  ethics: string;
  background?: string;
};

type PlanSection = keyof Plan | "title";

const PLAN_SECTIONS: { key: PlanSection; label: string; required: boolean; description: string }[] = [
  { key: "title", label: "Title", required: true, description: "Clear, concise research title" },
  { key: "background", label: "Background / Prior Work", required: false, description: "Context, related work, and evidence" },
  { key: "rq", label: "Research Question", required: true, description: "Main question driving your research" },
  { key: "hypothesis", label: "Hypothesis", required: false, description: "Expected outcomes or theoretical predictions" },
  { key: "data", label: "Data", required: false, description: "Data sources and collection methods" },
  { key: "methods", label: "Methods", required: false, description: "Analytical approaches and methodologies" },
  { key: "identification", label: "Identification", required: false, description: "Causal identification strategies" },
  { key: "validation", label: "Validation", required: false, description: "Robustness checks and validation approaches" },
  { key: "ethics", label: "Ethics", required: false, description: "Ethical considerations and approvals" },
];

export default function PlanPage() {
  const { session } = useSession();
  const { projectId } = useProject();
  const { push } = useToast();

  // Tab state
  const [tab, setTab] = useState<"editor" | "workflow" | "history">("editor");
  
  // Editor state
  const [currentSection, setCurrentSection] = useState<PlanSection>("title");
  const [saving, setSaving] = useState(false);
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
  
  // History state
  const [history, setHistory] = useState<{ id: string; created_at: string; title?: string; status?: string }[]>([]);

  // Workflow state
  const [wfRunning, setWfRunning] = useState(false);
  const [wfRunId, setWfRunId] = useState<string | null>(null);
  const [wfDraft, setWfDraft] = useState<Plan | null>(null);
  const [wfReview, setWfReview] = useState("");
  const [wfLogs, setWfLogs] = useState<string[]>([]);
  const [wfDiff, setWfDiff] = useState<{ field: string; before: string; after: string }[]>([]);
  
  // Global state
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLatest(): Promise<Plan | null> {
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
      return content || null;
    } catch (e: any) {
      setError(e?.message || "failed to load plan");
      return null;
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
    if (!projectId) return;
    (async () => {
      const content = await loadLatest();
      await loadHistory();
      await autoLoadThemeEvidence(content as any);
    })();
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
  async function loadThemeEvidence() {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/results?projectId=${projectId}&type=themes_selected`, {
        cache: 'no-store',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      if (items.length === 0) { push({ title: 'No selection', message: 'No saved theme selection found' }); return; }
      const latest = items[0]?.meta_json || {};
      const selected = Array.isArray(latest.items) ? latest.items : [];
      if (selected.length === 0) { push({ title: 'Empty selection', message: 'Latest selection has no items' }); return; }
      const lines: string[] = [];
      lines.push('# Background / Prior Work');
      selected.forEach((c: any, idx: number) => {
        const title = String(c?.title || `Theme ${idx + 1}`);
        lines.push(`\n## ${title}`);
        const ev: any[] = Array.isArray(c?.evidence) ? c.evidence : [];
        const bullets = ev.slice(0, 5).map((e) => `- ${String(e?.text || '').trim()}`).filter(Boolean);
        if (bullets.length) lines.push(bullets.join('\n'));
      });
      const text = lines.join('\n');
      setPlan((p) => ({ ...p, background: text }));
      push({ title: 'Loaded', message: 'Imported theme evidence into Background' });
    } catch (e: any) {
      push({ title: 'Load failed', message: e?.message || 'unknown error' });
    }
  }

  async function autoLoadThemeEvidence(existing?: any) {
    try {
      const hasBg = (existing && typeof existing.background === 'string' && existing.background.trim().length) || (plan?.background && plan.background.trim().length);
      if (!projectId || hasBg) return;
      
      // Try themes_selected first (from resume operation or client save)
      let res = await fetch(`/api/results?projectId=${projectId}&type=themes_selected`, {
        cache: 'no-store',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      let json = await res.json();
      let items = Array.isArray(json?.items) ? json.items : [];
      
      // Fallback: use latest candidates if no explicit selection was saved yet
      if (items.length === 0) {
        res = await fetch(`/api/results?projectId=${projectId}&type=candidates`, {
          cache: 'no-store',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        json = await res.json();
        items = Array.isArray(json?.items) ? json.items : [];
      }
      
      if (items.length === 0) return;
      
      const latest = items[0]?.meta_json || {};
      const selected = Array.isArray(latest.items) ? latest.items : [];
      if (selected.length === 0) return;
      
      const lines: string[] = [];
      lines.push('# Background / Prior Work\n');
      lines.push('*Auto-generated from selected theme research*\n');
      
      selected.forEach((c: any, idx: number) => {
        const title = String(c?.title || `Theme ${idx + 1}`);
        lines.push(`\n## ${title}`);
        
        // Add summary if available
        if (c?.summary) {
          lines.push(`\n${String(c.summary).trim()}`);
        }
        
        // Add evidence bullets
        const ev: any[] = Array.isArray(c?.evidence) ? c.evidence : [];
        if (ev.length > 0) {
          lines.push('\n### Evidence');
          const bullets = ev.slice(0, 8).map((e) => {
            const text = String(e?.text || '').trim();
            const kind = e?.kind === 'scholar' ? '[Scholar]' : e?.kind === 'provider' ? '[Research]' : '';
            return text ? `- ${kind} ${text}` : '';
          }).filter(Boolean);
          if (bullets.length) lines.push(bullets.join('\n'));
        }
        
        // Add metrics if available
        const metrics: string[] = [];
        if (typeof c?.novelty === 'number') metrics.push(`Novelty: ${(c.novelty * 100).toFixed(0)}%`);
        if (typeof c?.feasibility === 'number') metrics.push(`Feasibility: ${(c.feasibility * 100).toFixed(0)}%`);
        if (typeof c?.risk === 'number') metrics.push(`Risk: ${(c.risk * 100).toFixed(0)}%`);
        if (metrics.length) {
          lines.push(`\n*${metrics.join(' • ')}*`);
        }
      });
      
      const text = lines.join('\n');
      setPlan((p) => ({ ...p, background: text }));
      
      // Silent success - don't notify user since this is automatic
    } catch (error) {
      // Silent failure - don't notify user, just log for debugging
      console.warn('Auto-load theme evidence failed:', error);
    }
  }

  // Section navigation
  const sectionNavigation = (
    <Card variant="default" size="sm">
      <CardHeader>
        <CardTitle className="text-base">Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {PLAN_SECTIONS.map((section) => {
          const isActive = currentSection === section.key;
          const isCompleted = section.key === "title" ? !!plan.title?.trim() : !!(plan as any)[section.key]?.trim();
          const hasError = section.key === "title" ? !!fieldErrors.title : section.key === "rq" ? !!fieldErrors.rq : false;
          
          return (
            <button
              key={section.key}
              onClick={() => setCurrentSection(section.key)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isActive 
                  ? "border-white/40 bg-white/10" 
                  : "border-white/15 bg-transparent hover:bg-black/20 hover:border-white/25"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  hasError 
                    ? "bg-red-500/20 border border-red-500/40"
                    : isCompleted 
                      ? "bg-green-500/20 border border-green-500/40"
                      : "bg-white/10 border border-white/20"
                }`}>
                  {hasError ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 8V4M6 10V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : isCompleted ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M8.5 2.5L4 7L1.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                    {section.label}
                    {section.required && <span className="text-red-400 ml-1">*</span>}
                  </div>
                  <div className={`text-xs ${isActive ? "text-foreground/70" : "text-foreground/50"}`}>
                    {section.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
  
  // Current section editor
  const currentSectionData = PLAN_SECTIONS.find(s => s.key === currentSection)!;
  const currentValue = currentSection === "title" ? plan.title : (plan as any)[currentSection] || "";
  const currentError = currentSection === "title" ? fieldErrors.title : currentSection === "rq" ? fieldErrors.rq : undefined;
  
  const sectionEditor = (
    <Card variant="elevated" size="lg" className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{currentSectionData.label}</CardTitle>
          <p className="text-sm text-foreground/70 mt-1">{currentSectionData.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => regenerate(currentSection)}
            disabled={!projectId}
          >
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full">
          {currentSection === "title" ? (
            <input
              className="w-full h-12 px-4 rounded-lg border border-white/20 bg-black/20 text-lg font-medium placeholder:text-foreground/40 focus:border-white/40 focus:outline-none"
              placeholder="Enter your research title..."
              value={currentValue}
              onChange={(e) => setPlan({ ...plan, title: e.target.value })}
            />
          ) : (
            <textarea
              className="w-full h-80 p-4 rounded-lg border border-white/20 bg-black/20 text-sm placeholder:text-foreground/40 focus:border-white/40 focus:outline-none resize-none"
              placeholder={`Describe your ${currentSectionData.label.toLowerCase()}...`}
              value={currentValue}
              onChange={(e) => setPlan({ ...plan, [currentSection]: e.target.value } as any)}
            />
          )}
          {currentError && (
            <p className="text-sm text-red-400 mt-2">{currentError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  // Editor context panel
  const contextPanel = (
    <Card variant="default" size="sm">
      <CardHeader>
        <CardTitle className="text-base">Guidance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground/80">{currentSectionData.label} Tips</h4>
          <div className="text-xs text-foreground/60 space-y-1">
            {currentSection === "title" && (
              <ul className="list-disc list-inside space-y-1">
                <li>Keep it concise and descriptive</li>
                <li>Include key concepts</li>
                <li>Avoid jargon</li>
              </ul>
            )}
            {currentSection === "rq" && (
              <ul className="list-disc list-inside space-y-1">
                <li>Start with "How", "What", or "Why"</li>
                <li>Be specific and measurable</li>
                <li>Align with your methods</li>
              </ul>
            )}
            {currentSection === "hypothesis" && (
              <ul className="list-disc list-inside space-y-1">
                <li>State expected relationships</li>
                <li>Be testable</li>
                <li>Connect to theory</li>
              </ul>
            )}
          </div>
        </div>
        
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground/80">Actions</span>
          </div>
          <div className="space-y-2">
            <ActionButton
              action="primary"
              size="md"
              onClick={onSave as any}
              disabled={!projectId || saving}
              loading={saving}
              className="w-full"
            >
              Save Plan
            </ActionButton>
            {/* Load Theme Evidence removed from UI; evidence auto-loads on mount when background is empty */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportPlan(false)}
                disabled={!projectId}
                className="flex-1"
              >
                Export MD
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportPlan(true)}
                disabled={!projectId}
                className="flex-1"
              >
                + Citations
              </Button>
            </div>
          </div>
        </div>
        
        {(note || error) && (
          <div className="pt-3 border-t border-white/10">
            {note && <p className="text-xs text-green-400">{note}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Editor layout
  const editorContent = (
    <div className="grid grid-cols-[300px_minmax(0,1fr)_280px] gap-6 h-[calc(100vh-200px)]">
      {sectionNavigation}
      {sectionEditor}
      {contextPanel}
    </div>
  );

  // Workflow control center
  const workflowControlCenter = (
    <Card variant="elevated" size="md">
      <CardHeader>
        <CardTitle>Plan Generation</CardTitle>
        <p className="text-sm text-foreground/70">Generate and refine your research plan using AI workflow</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch draft button removed per updated requirements */}
        <ActionButton
          action="primary"
          size="lg"
          onClick={startPlanWorkflow}
          disabled={!projectId || wfRunning}
          loading={wfRunning}
          className="w-full"
        >
          Generate Plan via Workflow
        </ActionButton>
        
        {wfRunId && (
          <div className="text-xs text-foreground/60 bg-black/20 rounded px-2 py-1">
            Run ID: {wfRunId}
          </div>
        )}
        
        {wfDraft && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground/80">Review Generated Draft</div>
            <textarea
              className="w-full min-h-24 p-3 rounded-lg border border-white/20 bg-black/20 text-sm placeholder:text-foreground/40 focus:border-white/40 focus:outline-none resize-none"
              placeholder="Add review comments or request specific changes..."
              value={wfReview}
              onChange={(e) => setWfReview(e.target.value)}
            />
            <ActionButton
              action="primary"
              size="md"
              onClick={submitReview}
              disabled={!wfRunId}
              className="w-full"
            >
              Submit Review & Finalize
            </ActionButton>
          </div>
        )}
        
        {(note || error) && (
          <div className="pt-3 border-t border-white/10">
            {note && <p className="text-xs text-green-400">{note}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Draft preview (for workflow tab)
  const draftPreview = wfDraft ? (
    <Card variant="default" size="lg" className="flex-1">
      <CardHeader>
        <CardTitle>Generated Draft</CardTitle>
        <p className="text-sm text-foreground/70">Review the AI-generated plan and request changes if needed</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {PLAN_SECTIONS.map((section) => {
            const value = section.key === "title" ? wfDraft.title : (wfDraft as any)[section.key];
            if (!value?.trim()) return null;
            
            return (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground/80">{section.label}</h4>
                  {section.required && <span className="text-xs text-red-400">Required</span>}
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/15">
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap">{value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card variant="default" size="lg" className="flex-1">
      <CardContent className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-foreground/60">Generate a plan to see the draft preview</p>
        </div>
      </CardContent>
    </Card>
  );
  
  // History timeline
  const historyTimeline = (
    <Card variant="elevated" size="lg" className="flex-1">
      <CardHeader>
        <CardTitle>Version History</CardTitle>
        <p className="text-sm text-foreground/70">Track and restore previous versions of your research plan</p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-foreground/60">No version history yet. Save your plan to create versions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h, index) => (
              <div key={h.id} className="relative">
                {index < history.length - 1 && (
                  <div className="absolute left-4 top-12 w-px h-8 bg-white/20" />
                )}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {history.length - index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground/90">
                          {new Date(h.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {new Date(h.created_at).toLocaleTimeString()} • {h.status || "draft"}
                        </div>
                        {h.title && (
                          <div className="text-xs text-foreground/70 mt-1 truncate">
                            {h.title}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => onRestore(h.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Process monitor (for workflow tab)
  const processMonitor = (
    <Card variant="default" size="sm">
      <CardHeader>
        <CardTitle className="text-base">Process Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wfLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground/80">Workflow Logs</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {wfLogs.slice(0, 10).map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                  <span className="text-foreground/70">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {wfDiff.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground/80">Applied Changes</h4>
            <div className="space-y-2">
              {wfDiff.map((diff, i) => (
                <div key={i} className="p-2 rounded-lg bg-black/20 border border-white/15">
                  <div className="text-xs font-medium text-foreground/90 mb-1">{diff.field}</div>
                  <div className="text-xs space-y-1">
                    <div className="text-red-300/70">- {diff.before || "(empty)"}</div>
                    <div className="text-green-300/70">+ {diff.after || "(empty)"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {wfLogs.length === 0 && wfDiff.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs text-foreground/60">Process details will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Workflow layout
  const workflowContent = (
    <div className="grid grid-cols-[360px_minmax(0,1fr)_300px] gap-6">
      {workflowControlCenter}
      {draftPreview}
      {processMonitor}
    </div>
  );

  return (
    <section className="max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Research Plan</h1>
            <p className="text-foreground/70">Structure and develop your research methodology</p>
          </div>
        </div>
      </div>
      
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="mb-6">
          <TabsList className="bg-black/20 border border-white/15 p-1">
            <TabsTrigger value="editor" current={tab} onSelect={(v) => setTab(v as any)}>
              Editor
            </TabsTrigger>
            <TabsTrigger value="workflow" current={tab} onSelect={(v) => setTab(v as any)}>
              Workflow
            </TabsTrigger>
            <TabsTrigger value="history" current={tab} onSelect={(v) => setTab(v as any)}>
              History
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="editor" current={tab}>
          {editorContent}
        </TabsContent>
        
        <TabsContent value="workflow" current={tab}>
          {workflowContent}
        </TabsContent>
        
        <TabsContent value="history" current={tab}>
          <div className="grid gap-6">
            {historyTimeline}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
