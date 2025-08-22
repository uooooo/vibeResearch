// Minimal LLM provider abstraction with REST (OpenAI) and optional AI SDK wiring.
// Server-side only. Do not import in client components.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ModelOptions = {
  provider?: "openai" | "google";
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
};

export type LlmResponse<T = unknown> = {
  rawText: string;
  parsed?: T;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  latencyMs?: number;
};

export interface LlmProvider {
  chat<T = unknown>(messages: ChatMessage[], opts?: ModelOptions): Promise<LlmResponse<T>>;
}

function envFlag(name: string, fallback = "0"): boolean {
  const v = (process.env[name] || fallback).toString().trim();
  return v === "1" || v.toLowerCase() === "true";
}

function debugLog(...args: any[]) {
  if (envFlag("USE_LLM_DEBUG", "0")) {
    // eslint-disable-next-line no-console
    console.log("[LLM]", ...args);
  }
}

function isOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function pickModel(opts?: ModelOptions): { provider: "openai"; model: string } {
  const provider: "openai" = "openai";
  const model = isOpenRouter()
    ? opts?.model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
    : opts?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  return { provider, model };
}

async function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, rej) => (t = setTimeout(() => rej(new Error("llm_timeout")), ms)));
  try {
    const res = await Promise.race([p, timeout]);
    return res as T;
  } finally {
    if (t) clearTimeout(t);
  }
}

export class RestOpenAIProvider implements LlmProvider {
  async chat<T = unknown>(messages: ChatMessage[], opts: ModelOptions = {}): Promise<LlmResponse<T>> {
    const { model } = pickModel(opts);
    const started = Date.now();
    const useOpenRouter = isOpenRouter();
    const apiKey = useOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("LLM API key missing (OPENROUTER_API_KEY or OPENAI_API_KEY)");
    const body: any = {
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 800,
    };
    if (opts.json) {
      // Prefer JSON object mode when available
      body.response_format = { type: "json_object" };
    }
    const url = useOpenRouter
      ? (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1") + "/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    };
    if (useOpenRouter) {
      if (process.env.OPENROUTER_REFERRER) headers["HTTP-Referer"] = process.env.OPENROUTER_REFERRER;
      if (process.env.OPENROUTER_TITLE) headers["X-Title"] = process.env.OPENROUTER_TITLE;
    }
    const resp = await withTimeout(
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
      opts.timeoutMs ?? 60000,
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const code = useOpenRouter ? "openrouter_error" : "openai_error";
      throw new Error(`${code}_${resp.status}: ${text}`);
    }
    const data: any = await resp.json();
    const rawText: string = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage || undefined;
    const latencyMs = Date.now() - started;
    let parsed: T | undefined = undefined;
    if (opts.json) {
      try {
        parsed = JSON.parse(rawText) as T;
      } catch (_) {
        // leave parsed undefined; caller may salvage
      }
    }
    const path = useOpenRouter ? "rest:openrouter" : "rest:openai";
    debugLog(path, { model, latencyMs, usage });
    return { rawText, parsed, model, usage, latencyMs };
  }
}

// Optional AI SDK wrapper (dynamic). If installed and flag enabled, prefer it.
export class AIDynamicProvider implements LlmProvider {
  private rest = new RestOpenAIProvider();
  async chat<T = unknown>(messages: ChatMessage[], opts: ModelOptions = {}): Promise<LlmResponse<T>> {
    // Prefer AI SDK when present, but always fall back to REST.
    const preferSdk = envFlag("USE_AI_SDK", "1");
    if (!preferSdk) return this.rest.chat<T>(messages, opts);
    try {
      const dynamicImport = (eval("import") as any);
      const { generateText } = (await dynamicImport("ai").catch(() => ({}))) as any;
      const { createOpenAI } = (await dynamicImport("@ai-sdk/openai").catch(() => ({}))) as any;
      if (!generateText || !createOpenAI) return this.rest.chat<T>(messages, opts);
      const useOpenRouter = isOpenRouter();
      const apiKey = useOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
      if (!apiKey) return this.rest.chat<T>(messages, opts);
      const openai = createOpenAI({
        apiKey,
        baseURL: useOpenRouter ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1" : undefined,
      });
      const modelId = useOpenRouter
        ? opts.model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
        : opts.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
      const model = openai(modelId);
      const sys = messages.find((m) => m.role === "system")?.content || "";
      const userParts = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
      const started = Date.now();
      const result = await generateText({
        model,
        system: sys,
        prompt: userParts,
        temperature: opts.temperature ?? 0.2,
        maxTokens: opts.maxTokens ?? 800,
      });
      const rawText = String(result?.text ?? "");
      if (!rawText) return this.rest.chat<T>(messages, opts);
      let parsed: T | undefined;
      if (opts.json) {
        try { parsed = JSON.parse(rawText) as T; } catch { /* ignore */ }
      }
      const latencyMs = Date.now() - started;
      const path = useOpenRouter ? "ai-sdk:openrouter" : "ai-sdk:openai";
      debugLog(path, { model: modelId, latencyMs });
      return { rawText, parsed, model: String(modelId), usage: undefined, latencyMs };
    } catch {
      return this.rest.chat<T>(messages, opts);
    }
  }
}

export function createProvider(): LlmProvider {
  // For now, always return AI-dynamic which falls back to REST
  return new AIDynamicProvider();
}

export type { ChatMessage };
