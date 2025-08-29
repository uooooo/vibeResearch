import { splitText } from "./split";
import { embed } from "./embedding";

export async function ingestPlain(sb: any, input: { projectId: string; title: string; text: string; computeEmbedding?: boolean }) {
  const title = (input.title || "Untitled").trim();
  if (!title || !input.projectId || !input.text) return { ok: false, error: "invalid" };
  // Insert document
  const { data: doc, error: docErr } = await sb
    .from("documents")
    .insert({ project_id: input.projectId, title, source_url: null, metadata: { title } })
    .select("id")
    .single();
  if (docErr) return { ok: false, error: docErr.message };
  const documentId = doc.id as string;
  const chunks = splitText(input.text, 1000);
  // Optional: compute embeddings (best-effort)
  const rows = [] as any[];
  for (const c of chunks) {
    let vec: number[] | null = null;
    if (input.computeEmbedding) {
      try { vec = await embed(c.content); } catch { vec = null; }
    }
    rows.push({ document_id: documentId, idx: c.idx, content: c.content, embedding: vec ? (vec as any) : null });
  }
  try { await sb.from("chunks").insert(rows); } catch {}
  return { ok: true, documentId, chunks: rows.length };
}

