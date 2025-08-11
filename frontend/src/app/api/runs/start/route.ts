import { postStart } from "@/server/api/runs/start";
import { createRouteUserClient } from "@/lib/supabase/server-route";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const selfOrigin = new URL(req.url).origin;
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfOrigin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && !allow.includes(origin)) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const sb = createRouteUserClient();
  return postStart(req, { sb });
}
