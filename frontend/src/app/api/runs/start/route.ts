import { postStart } from "@/server/api/runs/start";
import { createRouteUserClient } from "@/lib/supabase/server-route";
import { supabaseUserFromRequest } from "@/lib/supabase/user-server";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const selfURL = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfURL.origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === selfURL.host : false);
  if (!allowed) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const headerClient = supabaseUserFromRequest(req);
  const cookieClient = await createRouteUserClient();
  const sb = headerClient || cookieClient;
  return postStart(req, { sb });
}
