// Server-side helper to persist tool invocation telemetry
// Expects a Supabase client with RLS as user

type Entry = {
  tool: string;
  args?: any;
  result?: any;
  cost_usd?: number;
  latency_ms?: number;
};

export async function logToolInvocation(sb: any, runId: string | null | undefined, entry: Entry) {
  if (!sb || !runId) return;
  try {
    await sb.from("tool_invocations").insert({
      run_id: runId,
      tool: entry.tool,
      args: entry.args ?? null,
      result: entry.result ?? null,
      cost_usd: typeof entry.cost_usd === "number" ? entry.cost_usd : null,
      latency_ms: typeof entry.latency_ms === "number" ? entry.latency_ms : null,
    });
  } catch {
    // swallow telemetry errors
  }
}

