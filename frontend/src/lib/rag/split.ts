export function splitText(text: string, maxChars = 1000) {
  const max = Math.max(200, Math.min(2000, maxChars));
  const parts = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const out: { idx: number; content: string }[] = [];
  let buf = "";
  let idx = 0;
  for (const p of parts) {
    if ((buf + (buf ? "\n\n" : "") + p).length > max && buf) {
      out.push({ idx, content: buf });
      idx += 1;
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push({ idx, content: buf });
  return out;
}

