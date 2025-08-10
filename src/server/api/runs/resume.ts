export async function postResume(req: Request, params: { id: string }): Promise<Response> {
  const contentType = { "content-type": "application/json" };
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const answers = body?.answers ?? null;

    // TODO: resume Mastra run with provided answers
    const payload = {
      ok: true,
      status: "not_implemented",
      message: "run resumed (stub)",
      id,
      answers,
    };
    return new Response(JSON.stringify(payload), { headers: contentType, status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "unknown" }),
      { headers: { "content-type": "application/json" }, status: 500 }
    );
  }
}

