"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/supabase/session";

type Project = { id: string; title: string; domain?: string | null };

type ProjectState = {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projects: Project[];
  loading: boolean;
  error: string | null;
};

const Ctx = createContext<ProjectState>({ projectId: null, setProjectId: () => {}, projects: [], loading: true, error: null });

const LS_KEY = "viberesearch:selectedProjectId";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/projects", {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error || "failed to load projects");
          setProjects([]);
          return;
        }
        const items: Project[] = json.items || [];
        setProjects(items);
        // decide selection: from LS, else keep current, else first project
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
        const current = projectId;
        const next = saved || current || (items[0]?.id ?? null);
        if (next !== projectId) setProjectIdState(next);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const setProjectId = (id: string | null) => {
    setProjectIdState(id);
    try {
      if (id) window.localStorage.setItem(LS_KEY, id);
      else window.localStorage.removeItem(LS_KEY);
    } catch {}
  };

  const value = useMemo<ProjectState>(() => ({ projectId, setProjectId, projects, loading, error }), [projectId, projects, loading, error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject() {
  return useContext(Ctx);
}

