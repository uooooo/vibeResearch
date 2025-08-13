"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/supabase/session";

type Project = { id: string; title: string; domain?: string | null; created_at: string };

export default function ProjectsPage() {
  const { session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("economics");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const token = session?.access_token || null;
    const res = await fetch("/api/projects", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error || "failed to load");
      return;
    }
    setProjects(json.items || []);
    setNote(json.note || null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = session?.access_token || null;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, domain }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error || "failed to create");
      return;
    }
    setTitle("");
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      {!session && (
        <div className="text-sm text-foreground/70">Sign in to create and view your projects.</div>
      )}
      {note && <div className="text-sm text-yellow-400">{note}</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 rounded-md border border-white/15 bg-black/30" placeholder="New project" required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Domain</span>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="px-3 py-2 rounded-md border border-white/15 bg-black/30">
            <option value="economics">economics</option>
            <option value="ai">ai</option>
            <option value="crypto">crypto</option>
          </select>
        </label>
        <button className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10" type="submit">Create</button>
      </form>
      <div className="grid gap-2">
        {projects.length === 0 && <p className="text-foreground/60 text-sm">No projects yet.</p>}
        {projects.map((p) => (
          <a key={p.id} href={`/projects/${p.id}`} className="rounded-lg border border-white/15 bg-black/30 p-3 hover:bg-white/5">
            <div className="font-medium">{p.title} <span className="text-xs text-foreground/60">[{p.domain || "n/a"}]</span></div>
            <div className="text-xs text-foreground/60">{new Date(p.created_at).toLocaleString()}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
