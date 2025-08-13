import { postResume } from "@/server/api/runs/resume";
import { createRouteUserClient } from "@/lib/supabase/server-route";

export async function POST(req: Request, context: any) {
  const origin = req.headers.get("origin");
  const selfURL = new URL(req.url);
  const allow = (process.env.APP_ALLOWED_ORIGINS || selfURL.origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = !origin || allow.includes(origin) || (origin ? new URL(origin).host === selfURL.host : false);
  if (!allowed) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const sb = await createRouteUserClient();
  return postResume(req, { id: context?.params?.id }, { sb });
}
