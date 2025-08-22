import { postStart } from "@/server/api/runs/start";
import { supabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const selfURL = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfURL.origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === selfURL.host : false);
  if (!allowed) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const sb = supabaseServerClient();
  return postStart(req, { sb });
}
