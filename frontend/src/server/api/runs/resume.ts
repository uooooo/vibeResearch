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

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const ping = () => controller.enqueue(encoder.encode(":\n\n"));

        // Try to mark run as resumed/running
        const sb = ctx.sb ?? null;
        if (sb) {
          await sb.from("runs").update({ status: "running" }).eq("id", id);
        }

        const emit = async (e: any) => {
          await send(e);
          ping();
        };

        // Run the workflow and stream progress/final
        const plan = await draftPlanFromSelection(selected, emit, id);

        // Persist result if possible
        if (sb) {
          try {
            await sb.from("results").insert({ run_id: id, content: plan });
            await sb.from("runs").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", id);
          } catch {}
        }

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
