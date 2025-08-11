export async function postStart(req: Request): Promise<Response> {
  try {
    const { kind = "theme", input = {} } = await req.json().catch(() => ({}));
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
        const runId = `run_${Math.random().toString(36).slice(2, 9)}`;

        send({ type: "started", at: Date.now(), input, runId });
        ping();
        await new Promise((r) => setTimeout(r, 200));
        send({ type: "progress", message: "fetching papers..." });
        await new Promise((r) => setTimeout(r, 300));
        send({ type: "progress", message: "ranking candidates..." });
        await new Promise((r) => setTimeout(r, 300));
        send({
          type: "candidates",
          items: [
            { id: "t1", title: "Impact of LLM adoption on SME productivity", novelty: 0.7, risk: 0.3 },
            { id: "t2", title: "Stablecoin shocks and DeFi liquidity", novelty: 0.8, risk: 0.5 },
            { id: "t3", title: "RLHF data leakage in academic benchmarks", novelty: 0.6, risk: 0.4 },
          ],
          runId,
        });
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
