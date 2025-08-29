export function splitTextIntoChunks(text: string, opts: { maxChars?: number } = {}) {
  const max = Math.max(200, Math.min(2000, opts.maxChars ?? 1000));
  const parts = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks: { text: string; start: number; end: number; section: number }[] = [];
  let buf = "";
  let start = 0;
  let section = 0;
  for (const p of parts) {
    if ((buf + (buf ? "\n\n" : "") + p).length > max && buf) {
      chunks.push({ text: buf, start, end: start + buf.length, section });
      section += 1;
      start += buf.length + 2;
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push({ text: buf, start, end: start + buf.length, section });
  return chunks;
}

