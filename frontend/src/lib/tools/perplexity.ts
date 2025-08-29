export type PerplexityQuery = { query: string; limit?: number; model?: string };

export async function perplexitySummarize(q: PerplexityQuery): Promise<{ bullets: string[]; latencyMs?: number }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { bullets: [] };
  const model = q.model || process.env.PERPLEXITY_MODEL || "sonar-small-online";
  const prompt = (q.query || "").trim();
  if (!prompt) return { bullets: [] };
  const started = Date.now();
  try {
    const resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Return concise JSON with key 'bullets' (array of 2-4 short, factual insights). No markdown, no commentary.",
          },
          { role: "user", content: `Summarize latest research insights for: ${prompt}. Return JSON.` },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
    if (!resp.ok) return { bullets: [] };
    const data: any = await resp.json().catch(() => ({}));
    const text: string = data?.choices?.[0]?.message?.content || "";
    let bullets: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.bullets)) bullets = parsed.bullets.slice(0, q.limit ?? 3);
    } catch {
      bullets = text
        .split(/\n|•|\-/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, q.limit ?? 3);
    }
    return { bullets, latencyMs: Date.now() - started };
  } catch {
    return { bullets: [] };
  }
}

