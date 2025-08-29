import { NextRequest } from "next/server";

// NOTE: This endpoint is primarily used as a backup/fallback.
// The main theme selection persistence happens in /api/runs/[id]/resume
// to avoid double-insertion conflicts and ensure atomicity.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = String(body?.projectId || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!projectId || items.length === 0) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });

    const { supabaseUserFromRequest } = await import("@/lib/supabase/user-server");
    const headerClient = supabaseUserFromRequest(req as any);
    const { createRouteUserClient } = await import("@/lib/supabase/server-route");
    const cookieClient = await createRouteUserClient();
    const sb = headerClient || cookieClient;
    if (!sb) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

    try {
      await sb.from("results").insert({
        project_id: projectId,
        type: "themes_selected",
        meta_json: { items },
      });
    } catch (e: any) {
      return Response.json({ ok: false, error: e?.message || "db_error" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
