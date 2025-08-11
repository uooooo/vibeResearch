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
        // Optional persistence via Supabase when configured and projectId provided
        const sb = ctx.sb ?? null;
        const projectId: string | null = (input as any)?.projectId ?? null;
        let dbRunId: string | null = null;
        if (sb && projectId) {
          const { data, error } = await sb
            .from("runs")
            .insert({ project_id: projectId, kind: "theme", status: "running", started_at: new Date().toISOString() })
            .select("id")
            .single();
          if (!error && data?.id) dbRunId = data.id as string;
        }
        const runId = dbRunId ?? `run_${Math.random().toString(36).slice(2, 9)}`;

        send({ type: "started", at: Date.now(), input, runId });
        ping();
        await new Promise((r) => setTimeout(r, 200));
        send({ type: "progress", message: "fetching papers..." });
        await new Promise((r) => setTimeout(r, 300));
        send({ type: "progress", message: "ranking candidates..." });
        await new Promise((r) => setTimeout(r, 300));
        const candidates = [
          { id: "t1", title: "Impact of LLM adoption on SME productivity", novelty: 0.7, risk: 0.3 },
          { id: "t2", title: "Stablecoin shocks and DeFi liquidity", novelty: 0.8, risk: 0.5 },
          { id: "t3", title: "RLHF data leakage in academic benchmarks", novelty: 0.6, risk: 0.4 },
        ];
        // Persist candidates if possible
        if (sb && dbRunId) {
          await sb.from("run_candidates").insert(
            candidates.map((c) => ({ run_id: dbRunId, title: c.title, novelty: c.novelty, risk: c.risk }))
          );
        }
        send({ type: "candidates", items: candidates, runId });
        // Update run status to suspended if persisted
        if (sb && dbRunId) {
          await sb.from("runs").update({ status: "suspended" }).eq("id", dbRunId);
        }
        send({ type: "suspend", reason: "select_candidate", runId });
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
