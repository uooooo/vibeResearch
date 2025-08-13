import type { ThemeCandidate } from "@/agents/theme-finder";
import { draftPlanFromSelection } from "@/workflows/research-plan";

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

    // Produce plan without streaming for compatibility with existing UI
    const plan = await draftPlanFromSelection(selected, async () => {}, id);

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
        await sb.from("runs").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", id);
      } catch {}
    }

    return new Response(
      JSON.stringify({ ok: true, status: "resumed", id, plan, selected }),
      { headers: { "content-type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "unknown" }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
}
