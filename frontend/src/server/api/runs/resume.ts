import type { ThemeCandidate } from "@/agents/theme-finder";
import { draftPlanFromSelection } from "@/workflows/research-plan";
import { resumeThemeMastraById } from "@/workflows/mastra/theme";

type Ctx = { sb?: any };
export async function postResume(req: Request, params: { id: string }, ctx: Ctx = {}): Promise<Response> {
  try {
    const { id } = params;
    const { z } = await import("zod");
    const schema = z.object({
      answers: z
        .object({
          selected: z.object({ id: z.string(), title: z.string() }).optional(),
          review: z.string().optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      });
    }
    const body = parsed.data as any;
    const selected: ThemeCandidate | null = body?.answers?.selected ?? null;
    const review: string | undefined = body?.answers?.review ?? undefined;

    // Mark run as running if possible
    const sb = ctx.sb ?? null;
    if (sb) {
      await sb.from("runs").update({ status: "running" }).eq("id", id);
    }

    // Try Mastra resume if mapping exists; fallback logic per kind
    let plan: any = null;
    let llm: any = null;
    let kind: string | null = null;
    if (sb) {
      try {
        const { data: runRow } = await sb.from("runs").select("kind, project_id").eq("id", id).single();
        kind = runRow?.kind ?? null;
      } catch {}
    }

    if (sb) {
      try {
        const { data: mapRow } = await sb
          .from("workflow_runs")
          .select("mastra_run_id, mastra_workflow_id")
          .eq("run_id", id)
          .single();
        const mastraRunId: string | null = mapRow?.mastra_run_id ?? null;
        const wfId: string | null = mapRow?.mastra_workflow_id ?? null;
        if (mastraRunId && kind === "theme" && selected) {
          const resumed = await resumeThemeMastraById(mastraRunId, { selected });
          const output = (resumed as any)?.steps?.["draft-plan"]?.output ?? null;
          plan = output?.plan ?? null;
          llm = output?._llm ?? null;
          // Store latest snapshot for debugging/audit
          try { await sb.from("workflow_runs").update({ snapshot: resumed ?? null }).eq("run_id", id); } catch {}
        } else if (mastraRunId && kind === "plan" && typeof review === "string") {
          const { resumePlanMastraById } = await import("@/workflows/mastra/plan");
          const resumed = await resumePlanMastraById(mastraRunId, { review });
          const output = (resumed as any)?.steps?.["finalize"]?.output ?? null;
          plan = output?.plan ?? null;
          // Update snapshot
          try { await sb.from("workflow_runs").update({ snapshot: resumed ?? null }).eq("run_id", id); } catch {}
        }
      } catch {}
    }
    // Fallbacks
    if (!plan && kind === "theme") {
      plan = await draftPlanFromSelection(selected, async () => {}, id);
      if (!llm) llm = { path: "local:stub" };
    }
    if (!plan && kind === "plan" && typeof review === "string" && sb) {
      // Local fallback finalize: load pending draft from results and finalize with review note
      try {
        const { data: pending } = await sb
          .from("results")
          .select("meta_json")
          .eq("run_id", id)
          .eq("type", "plan_draft_pending_review")
          .order("created_at", { ascending: false })
          .limit(1);
        const draft = pending?.[0]?.meta_json ?? null;
        if (draft) {
          plan = { ...draft, review_note: review };
        }
      } catch {}
    }

    // Persist result if possible
    if (sb) {
      try {
        // Lookup project for this run to scope result
        const { data: runRow2 } = await sb.from("runs").select("project_id").eq("id", id).single();
        const projectId = runRow2?.project_id ?? null;
        await sb.from("results").insert({
          run_id: id,
          project_id: projectId,
          type: "plan",
          meta_json: plan,
        });
        // Also record a plan draft for versioned editing in /plan
        if (projectId) {
          try {
            await sb
              .from("plans")
              .insert({ project_id: projectId, title: String((plan as any)?.title || "Research Plan"), status: "draft", content: plan });
          } catch {}
        }
        await sb.from("runs").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", id);
      } catch {}
    }

    // Telemetry: log the plan drafting LLM if available
    try {
      if (sb && llm) {
        const { logToolInvocation } = await import("@/lib/telemetry/log");
        await logToolInvocation(sb, id, {
          tool: "llm.chat",
          args: { step: "draft-plan" },
          result: { path: llm.path || "", model: llm.model || "" },
          latency_ms: typeof llm.latencyMs === "number" ? llm.latencyMs : undefined,
        });
      }
    } catch {}

    return new Response(
      JSON.stringify({ ok: true, status: "resumed", id, plan, selected, llm }),
      { headers: { "content-type": "application/json", "cache-control": "no-store" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "unknown" }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
}
