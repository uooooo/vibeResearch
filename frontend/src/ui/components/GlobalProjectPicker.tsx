"use client";
import { useProject } from "@/lib/project/context";

export default function GlobalProjectPicker() {
  const { projectId, setProjectId, projects, loading, error } = useProject();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-foreground/70 hidden md:inline">Project</span>
      <select
        className="bg-transparent border border-white/15 rounded-md px-2 py-1"
        value={projectId ?? ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        disabled={loading || !!error || projects.length === 0}
        title={error || (projects.length === 0 ? "No projects" : "Select project")}
      >
        <option value="">—</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} className="bg-black">
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}

