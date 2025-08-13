import { ThemeFinderAgent, type ThemeFinderInput } from "@/agents/theme-finder";
import { startThemeMastra } from "@/workflows/mastra/theme";

type Ctx = { sb?: any };
export async function postStart(req: Request, ctx: Ctx = {}): Promise<Response> {
  try {
    const { z } = await import("zod");
    const schema = z.object({
      kind: z.literal("theme"),
      input: z
        .object({
          query: z.string().min(1).max(2000).optional(),
          projectId: z.string().uuid().optional(),
          domain: z.string().optional(),
          keywords: z.string().optional(),
        })
        .default({}),
    });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        status: 400,
      });
    }
    const { kind, input } = parsed.data;
    if (kind !== "theme") {
      return new Response(JSON.stringify({ ok: false, error: "unsupported kind" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const ping = () => controller.enqueue(encoder.encode(":\n\n"));

        const sb = ctx.sb ?? null;
        const projectId: string | null = (input as any)?.projectId ?? null;
        let dbRunId: string | null = null;
        if (sb && projectId) {
          const { data } = await sb
            .from("runs")
            .insert({ project_id: projectId, kind: "theme", status: "running", started_at: new Date().toISOString() })
            .select("id")
            .single();
          if (data?.id) dbRunId = data.id as string;
        }

        const agent = new ThemeFinderAgent({ maxSteps: 8 });
        const emit = async (e: any) => {
          // Persist notable events when possible
          if (sb && dbRunId) {
            try {
              if (e?.type === "suspend") {
                await sb.from("runs").update({ status: "suspended" }).eq("id", dbRunId);
              }
              if (e?.type === "candidates" && Array.isArray(e.items)) {
                // Persist candidates with explicit type and project scoping
                await sb.from("results").insert({
                  run_id: dbRunId,
                  project_id: projectId,
                  type: "candidates",
                  meta_json: { items: e.items },
                });
              }
            } catch {}
          }
          await send(e);
          ping();
        };

        // Prefer Mastra workflow to generate candidates and then suspend.
        try {
          await emit({ type: "progress", message: "initializing workflow..." });
          const { result, runId: mastraRunId } = await startThemeMastra(input as any);
          const candidates = (result as any)?.steps?.["find-candidates"]?.output?.candidates as any[] | undefined;
          if (Array.isArray(candidates) && candidates.length > 0) {
            await emit({ type: "candidates", items: candidates, runId: dbRunId ?? undefined });
            // Persist Mastra run mapping for resume
            if (sb && dbRunId && mastraRunId) {
              try {
                await sb.from("workflow_runs").insert({
                  run_id: dbRunId,
                  mastra_workflow_id: "theme-workflow",
                  mastra_run_id: mastraRunId,
                  snapshot: result ?? null,
                });
              } catch {}
            }
            await emit({ type: "suspend", reason: "select_candidate", runId: dbRunId ?? undefined });
            controller.close();
            return;
          }
        } catch {
          // fall back to stub agent
        }

        // Fallback: Run stub agent and stream events
        await agent.run(input as ThemeFinderInput, emit);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "unknown" }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
}
