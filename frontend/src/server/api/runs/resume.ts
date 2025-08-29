import type { ThemeCandidate } from "@/agents/theme-finder";
import { draftPlanFromSelection } from "@/workflows/research-plan";
import { resumeThemeMastraById } from "@/workflows/mastra/theme";

type Ctx = { sb?: any };
export async function postResume(req: Request, params: { id: string }, ctx: Ctx = {}): Promise<Response> {
  try {
    const { id } = params;
    const { z } = await import("zod");
    const schema = z.object({ answers: z.object({ selected: z.object({ id: z.string(), title: z.string() }).optional() }).optional() });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      });
    }
    const body = parsed.data as any;
    const selected: ThemeCandidate | null = body?.answers?.selected ?? null;

    // Mark run as running if possible
    const sb = ctx.sb ?? null;
    if (sb) {
      await sb.from("runs").update({ status: "running" }).eq("id", id);
    }

    // Try Mastra resume if mapping exists; fallback to local draftPlan
    let plan: any = null;
    let llm: any = null;
    if (sb) {
      try {
        const { data: mapRow } = await sb
          .from("workflow_runs")
          .select("mastra_run_id, mastra_workflow_id")
          .eq("run_id", id)
          .single();
        const mastraRunId: string | null = mapRow?.mastra_run_id ?? null;
        if (mastraRunId && selected) {
          const resumed = await resumeThemeMastraById(mastraRunId, { selected });
          const output = (resumed as any)?.steps?.["draft-plan"]?.output ?? null;
          plan = output?.plan ?? null;
          llm = output?._llm ?? null;
          if (sb && llm) {
            try {
              await sb.from("tool_invocations").insert({
                run_id: id,
                tool: "llm",
                args_json: { step: "draft-plan" },
                result_meta: { path: llm.path, model: llm.model },
                latency_ms: llm.latencyMs ?? null,
              });
            } catch {}
          }
          // Store latest snapshot for debugging/audit
          try {
            await sb
              .from("workflow_runs")
              .update({ snapshot: resumed ?? null })
              .eq("run_id", id);
          } catch {}
        }
      } catch {}
    }
  if (!plan) {
      plan = await draftPlanFromSelection(selected, async () => {}, id);
      if (!llm) llm = { path: "local:stub" };
    }

    // Persist result if possible
    if (sb) {
      try {
        // Lookup project for this run to scope result
        const { data: runRow } = await sb.from("runs").select("project_id").eq("id", id).single();
        const projectId = runRow?.project_id ?? null;
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
