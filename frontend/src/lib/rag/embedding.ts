export async function embed(text: string): Promise<number[] | null> {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small", input: text }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const vec: number[] | undefined = data?.data?.[0]?.embedding;
    return Array.isArray(vec) ? vec : null;
  } catch { return null; }
}

