import { postResume } from "@/server/api/runs/resume";
import { createRouteUserClient } from "@/lib/supabase/server-route";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get("origin");
  const selfOrigin = new URL(req.url).origin;
  if (origin && origin !== selfOrigin) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  const sb = createRouteUserClient();
  return postResume(req, { id: params.id }, { sb });
}
