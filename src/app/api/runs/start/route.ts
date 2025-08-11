import { postStart } from "@/server/api/runs/start";
import { createRouteUserClient } from "@/lib/supabase/server-route";

export async function POST(req: Request) {
  // Basic Origin check (same-origin POSTs only)
  const origin = req.headers.get("origin");
  const selfOrigin = new URL(req.url).origin;
  if (origin && origin !== selfOrigin) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const sb = createRouteUserClient();
  return postStart(req, { sb });
}
