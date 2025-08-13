"use client";
import { useState } from "react";
import ProjectPicker from "@/ui/components/ProjectPicker";
import { useSession } from "@/lib/supabase/session";

export default function ExportPage() {
  const { session } = useSession();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [csl, setCsl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function onExport() {
    if (!projectId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/export/plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "export failed");
      setMarkdown(json.markdown || "");
      setCsl(JSON.stringify(json.csl || [], null, 2));
    } catch (e: any) {
      setError(e?.message || "export failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Export</h1>
        <ProjectPicker value={projectId} onChange={setProjectId} />
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="flex gap-3">
        <button onClick={onExport} disabled={!projectId || running} className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
          {running ? "Exporting..." : "Export Markdown + CSL"}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Markdown</span>
          <textarea readOnly className="px-3 py-2 rounded-md border border-white/15 bg-black/30 min-h-60 font-mono text-sm" value={markdown} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">CSL (JSON)</span>
          <textarea readOnly className="px-3 py-2 rounded-md border border-white/15 bg-black/30 min-h-60 font-mono text-sm" value={csl} />
        </label>
      </div>
    </section>
  );
}

