import crypto from "crypto";
import { splitTextIntoChunks } from "./split";

export type IngestResult = { ok: true; documentId: string; chunks: number } | { ok: false; error: string };

export async function ingestPlainText(sb: any, input: { projectId: string; title: string; text: string }): Promise<IngestResult> {
  try {
    const hash = crypto.createHash("sha256").update(input.text).digest("hex");
    const { data: docRow, error: docErr } = await sb
      .from("documents")
      .insert({ project_id: input.projectId, source_type: "plain", url: null, doi: null, sha256: hash, metadata_json: { title: input.title } })
      .select("id")
      .single();
    if (docErr) return { ok: false, error: docErr.message } as any;
    const documentId = docRow.id as string;
    const chunks = splitTextIntoChunks(input.text, { maxChars: 1000 });
    const rows = chunks.map((c) => ({ document_id: documentId, section: String(c.section), start: c.start, end: c.end, text: c.text, text_hash: crypto.createHash("sha256").update(c.text).digest("hex"), embedding: null }));
    try { await sb.from("chunks").insert(rows); } catch {}
    return { ok: true, documentId, chunks: rows.length };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ingest_failed" };
  }
}

