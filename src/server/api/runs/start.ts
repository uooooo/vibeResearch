export async function postStart(req: Request): Promise<Response> {
  const contentType = { "content-type": "application/json" };
  try {
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind ?? "unknown";
    const input = body?.input ?? null;

    // TODO: wire Mastra agent/workflow and streaming SSE
    const payload = {
      ok: true,
      status: "not_implemented",
      message: "run started (stub)",
      kind,
      input,
    };
    return new Response(JSON.stringify(payload), { headers: contentType, status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "unknown" }),
      { headers: contentType, status: 500 }
    );
  }
}

