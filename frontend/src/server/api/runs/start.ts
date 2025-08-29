import { ThemeFinderAgent, type ThemeFinderInput } from "@/agents/theme-finder";
import { startThemeMastra } from "@/workflows/mastra/theme";
import { createProvider } from "@/lib/llm/provider";
import { buildCandidateMessages, type CandidatesJSON } from "@/agents/prompts/candidates";
import { parseCandidatesLLM } from "@/lib/llm/json";

type Ctx = { sb?: any };
export async function postStart(req: Request, ctx: Ctx = {}): Promise<Response> {
  try {
    const { z } = await import("zod");
    const schema = z.object({
      kind: z.enum(["theme", "plan"]),
      input: z
        .object({
          // Treat empty strings as undefined to avoid validation noise
          query: z
            .preprocess((v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v), z.string().min(1).max(2000))
            .optional(),
          title: z
            .preprocess((v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v), z.string().min(1).max(300))
            .optional(),
          rq: z.string().optional(),
          // Accept null and coerce to undefined
          projectId: z
            .string()
            .uuid()
            .optional()
            .nullable()
            .transform((v) => (v ? v : undefined)),
          domain: z.string().optional(),
          keywords: z.string().optional(),
        })
        .default({}),
    });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        status: 400,
      });
    }
    const { kind, input } = parsed.data;
    if (kind !== "theme" && kind !== "plan") {
      return new Response(JSON.stringify({ ok: false, error: "unsupported kind" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const ping = () => controller.enqueue(encoder.encode(":\n\n"));

        const sb = ctx.sb ?? null;
        const projectId: string | null = (input as any)?.projectId ?? null;
        let dbRunId: string | null = null;
        if (sb && projectId) {
          const { data } = await sb
            .from("runs")
            .insert({ project_id: projectId, kind, status: "running", started_at: new Date().toISOString() })
            .select("id")
            .single();
          if (data?.id) dbRunId = data.id as string;
        }
        // Emit a canonical started event so the UI captures a usable runId
        await send({ type: "started", at: Date.now(), input, runId: dbRunId || undefined });
        ping();
        
        // THEME kind: existing flow
        if (kind === "theme") {
          const agent = new ThemeFinderAgent({ maxSteps: 8 });
          const { logToolInvocation } = await import("@/lib/telemetry/log").catch(() => ({ logToolInvocation: async () => {} } as any));
          const emit = async (e: any) => {
            // Persist notable events when possible
            if (sb && dbRunId) {
              try {
                if (e?.type === "suspend") {
                  await sb.from("runs").update({ status: "suspended" }).eq("id", dbRunId);
                }
                if (e?.type === "candidates" && Array.isArray(e.items)) {
                  // Persist candidates with explicit type and project scoping
                  await sb.from("results").insert({
                    run_id: dbRunId,
                    project_id: projectId,
                    type: "candidates",
                    meta_json: { items: e.items },
                  });
                }
              } catch {}
            }
            await send(e);
            ping();
          };
        const { logToolInvocation } = await import("@/lib/telemetry/log").catch(() => ({ logToolInvocation: async () => {} } as any));
        const emit = async (e: any) => {
          // Persist notable events when possible
          if (sb && dbRunId) {
            try {
              if (e?.type === "suspend") {
                await sb.from("runs").update({ status: "suspended" }).eq("id", dbRunId);
              }
              if (e?.type === "candidates" && Array.isArray(e.items)) {
                // Persist candidates with explicit type and project scoping
                await sb.from("results").insert({
                  run_id: dbRunId,
                  project_id: projectId,
                  type: "candidates",
                  meta_json: { items: e.items },
                });
              }
            } catch {}
          }
          await send(e);
          ping();
        };

          // Prefer Mastra workflow to generate candidates and then suspend.
          try {
            await emit({ type: "progress", message: "initializing workflow..." });
            const { result, runId: mastraRunId } = await startThemeMastra(input as any);
            const candidates = (result as any)?.steps?.["find-candidates"]?.output?.candidates as any[] | undefined;
            const llmMeta = (result as any)?.steps?.["find-candidates"]?.output?._llm as any | undefined;
            const scholarMeta = (result as any)?.steps?.["find-candidates"]?.output?._scholar as any | undefined;
          if (scholarMeta && typeof scholarMeta.count === "number") {
            // Surface scholar activity in progress logs for visibility
            await emit({ type: "progress", message: `scholar_hits=${scholarMeta.count}${Array.isArray(scholarMeta.top) && scholarMeta.top.length ? ` top=\"${scholarMeta.top.filter(Boolean).slice(0,2).join("; ")}\"` : ""}` });
          }
          if (llmMeta && (process.env.USE_LLM_DEBUG || "0") === "1") {
            await emit({ type: "progress", message: `llm_path=${llmMeta?.path || "unknown"} model=${llmMeta?.model || ""} latencyMs=${llmMeta?.latencyMs || ""}` });
          }
          if (sb && dbRunId && llmMeta) {
            try {
              await sb.from("tool_invocations").insert({
                run_id: dbRunId,
                tool: "llm",
                args_json: { step: "find-candidates" },
                result_meta: { path: llmMeta.path, model: llmMeta.model, latency_ms: llmMeta.latencyMs },
                latency_ms: llmMeta.latencyMs ?? null,
              });
            } catch {}
          }
          if (Array.isArray(candidates) && candidates.length > 0) {
            await emit({ type: "candidates", items: candidates, runId: dbRunId ?? undefined });
            // Persist Mastra run mapping for resume
            if (sb && dbRunId && mastraRunId) {
              try {
                await sb.from("workflow_runs").insert({
                  run_id: dbRunId,
                  mastra_workflow_id: "theme-workflow",
                  mastra_run_id: mastraRunId,
                  snapshot: result ?? null,
                });
              } catch {}
            }
            // Telemetry: record tools used for this step
            try {
              if (sb && dbRunId && scholarMeta) {
                const iq = [ (input as any)?.query, (input as any)?.keywords ].filter(Boolean).join(" ").trim();
                await logToolInvocation(sb, dbRunId, {
                  tool: "scholar.search",
                  args: { query: iq || undefined, limit: 5 },
                  result: { count: scholarMeta.count, top: Array.isArray(scholarMeta.top) ? scholarMeta.top : [] },
                  latency_ms: Number(scholarMeta.latencyMs || 0) || undefined,
                });
              }
              if (sb && dbRunId && llmMeta) {
                await logToolInvocation(sb, dbRunId, {
                  tool: "llm.chat",
                  args: { step: "find-candidates" },
                  result: { path: llmMeta.path || "", model: llmMeta.model || "" },
                  latency_ms: Number(llmMeta.latencyMs || 0) || undefined,
                });
              }
            } catch {}
            await emit({ type: "suspend", reason: "select_candidate", runId: dbRunId ?? undefined });
            controller.close();
            return;
          }
        } catch {
          // proceed to provider fallback
        }

          // Provider fallback (bypass Mastra) — still emits candidates and suspend so UI flow remains intact.
          try {
            const provider = createProvider();
            const msgs = buildCandidateMessages({
              query: (input as any)?.query,
              domain: (input as any)?.domain,
              keywords: (input as any)?.keywords,
            });
<<<<<<< HEAD

          // Try scholar grounding even in fallback
          let scholarTop: string[] = [];
          let scholarLatency: number | undefined = undefined;
          try {
            const q = [ (input as any)?.query, (input as any)?.keywords, (input as any)?.domain ]
              .filter(Boolean)
              .join(" ")
              .trim();
            if (q) {
              const { scholarSearch } = await import("@/lib/tools/scholar");
              const r = await scholarSearch({ query: q, limit: 5 });
              scholarTop = (r.items || []).slice(0, 3).map((it) => it.title || "").filter(Boolean);
              scholarLatency = r.latencyMs;
              await emit({ type: "progress", message: `scholar_hits=${(r.items || []).length}${scholarTop.length ? ` top=\"${scholarTop.slice(0,2).join("; ")}\"` : ""}` });
              // Telemetry
              if (sb && dbRunId) {
                await logToolInvocation(sb, dbRunId, {
                  tool: "scholar.search",
                  args: { query: q, limit: 5 },
                  result: { count: (r.items || []).length, top: scholarTop },
                  latency_ms: scholarLatency,
                });
              }
            }
          } catch {}

          const msgsWithContext = scholarTop.length
            ? ([...msgs, { role: "user", content: `Related works (for grounding):\n- ${scholarTop.join("\n- ")}` }] as any)
            : (msgs as any);

          const res = await provider.chat<CandidatesJSON>(msgsWithContext, { json: true, maxTokens: 700 });
          const parsed = (res.parsed as CandidatesJSON | undefined) ?? JSON.parse(res.rawText);
=======
          
          // Try scholar grounding even in fallback
          let scholarTop: string[] = [];
          let scholarLatency: number | undefined = undefined;
          try {
            const q = [ (input as any)?.query, (input as any)?.keywords, (input as any)?.domain ]
              .filter(Boolean)
              .join(" ")
              .trim();
            if (q) {
              const { scholarSearch } = await import("@/lib/tools/scholar");
              const r = await scholarSearch({ query: q, limit: 5 });
              scholarTop = (r.items || []).slice(0, 3).map((it) => it.title || "").filter(Boolean);
              scholarLatency = r.latencyMs;
              await emit({ type: "progress", message: `scholar_hits=${(r.items || []).length}${scholarTop.length ? ` top=\"${scholarTop.slice(0,2).join("; ")}\"` : ""}` });
              // Telemetry
              if (sb && dbRunId) {
                await logToolInvocation(sb, dbRunId, {
                  tool: "scholar.search",
                  args: { query: q, limit: 5 },
                  result: { count: (r.items || []).length, top: scholarTop },
                  latency_ms: scholarLatency,
                });
              }
            }
          } catch {}

          const msgsWithContext = scholarTop.length
            ? ([...msgs, { role: "user", content: `Related works (for grounding):\n- ${scholarTop.join("\n- ")}` }] as any)
            : (msgs as any);

          const res = await provider.chat<CandidatesJSON>(msgsWithContext, { json: true, maxTokens: 700 });
          const parsed = (res.parsed as CandidatesJSON | undefined) ?? parseCandidatesLLM(res.rawText);
          const items = Array.isArray(parsed?.candidates) ? parsed!.candidates.slice(0, 3).map((c, i) => ({
            id: c.id || `t${i + 1}`,
            title: String(c.title || "Untitled theme"),
            novelty: Math.max(0, Math.min(1, Number(c.novelty ?? 0.5))),
            risk: Math.max(0, Math.min(1, Number(c.risk ?? 0.5))),
          })) : [];
          if (items.length > 0) {
            if ((process.env.USE_LLM_DEBUG || "0") === "1") {
              await emit({ type: "progress", message: `llm_path=${res.path || "unknown"} model=${res.model || ""} latencyMs=${res.latencyMs || ""}` });
            }
            // Telemetry for LLM
            try {
              if (sb && dbRunId) {
                await logToolInvocation(sb, dbRunId, {
                  tool: "llm.chat",
                  args: { step: "find-candidates (fallback)", provider_path: res.path, json: true },
                  result: { model: res.model || "", usage: (res as any).usage || null },
                  latency_ms: typeof res.latencyMs === "number" ? res.latencyMs : undefined,
                });
              }
            } catch {}
            await emit({ type: "candidates", items, runId: dbRunId ?? undefined });
            await emit({ type: "suspend", reason: "select_candidate", runId: dbRunId ?? undefined });
            controller.close();
            return;
          }
        } catch (e: any) {
          if ((process.env.USE_LLM_DEBUG || "0") === "1") {
            await emit({ type: "progress", message: `llm_fallback_error=${e?.message || "unknown"}` });
          }
        }

          // Fallback: Run stub agent and stream events. If no DB run was created,
          // still stream candidates/suspend for UI, but resume will be limited.
          await agent.run(input as ThemeFinderInput, emit);
          controller.close();
          return;
        }

        // PLAN kind: run plan workflow to draft then suspend for review
        if (kind === "plan") {
          try {
            await send({ type: "progress", message: "initializing plan workflow..." });
            const { startPlanMastra } = await import("@/workflows/mastra/plan");
            const { result, runId: mastraRunId } = await startPlanMastra(input as any);
            const draft = (result as any)?.steps?.["draft-plan"]?.output?.plan ?? null;
            if (draft) {
              await send({ type: "review", plan: draft, runId: dbRunId ?? undefined });
              // Persist mapping for resume
              if (sb && dbRunId && mastraRunId) {
                try {
                  await sb.from("workflow_runs").insert({
                    run_id: dbRunId,
                    mastra_workflow_id: "plan-workflow",
                    mastra_run_id: mastraRunId,
                    snapshot: result ?? null,
                  });
                  await sb.from("runs").update({ status: "suspended" }).eq("id", dbRunId);
                } catch {}
              }
              await send({ type: "suspend", reason: "review_plan", runId: dbRunId ?? undefined });
              controller.close();
              return;
            }
          } catch (e: any) {
            await send({ type: "progress", message: `plan_workflow_error=${e?.message || "unknown"}` });
          }
          controller.close();
          return;
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "unknown" }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
}
