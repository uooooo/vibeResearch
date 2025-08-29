export type RawCandidate = {
  id?: string;
  title?: string;
  novelty?: number; // 0..1
  feasibility?: number; // optional in input
  risk?: number; // 0..1
  summary?: string;
};

export type CSLAuthor = { given?: string; family?: string };
export type CSLItemLite = { title?: string; issued?: any; author?: CSLAuthor[] };

export type AggregateInput = {
  candidates: RawCandidate[];
  scholarlyTop?: string[]; // top related titles
  scholarlyItems?: CSLItemLite[]; // detailed items with authors (preferred)
  insights?: string[]; // provider bullets
  topK?: number; // default 10
  weights?: { novelty?: number; feasibility?: number; risk?: number };
};

export type AggregatedCandidate = RawCandidate & {
  id: string;
  title: string;
  novelty: number;
  feasibility: number;
  risk: number;
  evidence?: Array<{ kind: 'scholar' | 'provider'; text: string }>;
  rank?: number;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function scoreFeasibility(texts: string[]): number {
  const t = texts.join(' \n ').toLowerCase();
  const hits = [
    'dataset',
    'data',
    'benchmark',
    'public',
    'open',
    'replic',
    'available',
    'method',
    'model',
    'evaluation',
  ].reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
  // Map hits to 0.3..0.9 range
  return clamp01(0.3 + Math.min(6, hits) * 0.1);
}

function scoreNovelty(texts: string[]): number {
  const t = texts.join(' \n ').toLowerCase();
  const pos = ['novel', 'unexplored', 'gap', 'open problem', 'new', 'understudied'];
  const neg = ['survey', 'review', 'well-studied'];
  let s = 0.5 + pos.reduce((a, kw) => a + (t.includes(kw) ? 0.1 : 0), 0);
  s -= neg.reduce((a, kw) => a + (t.includes(kw) ? 0.1 : 0), 0);
  return clamp01(s);
}

export function aggregateCandidates(input: AggregateInput): AggregatedCandidate[] {
  const topK = Math.max(1, Math.min(20, input.topK ?? 10));
  const w = {
    novelty: input.weights?.novelty ?? 0.45,
    feasibility: input.weights?.feasibility ?? 0.45,
    risk: input.weights?.risk ?? 0.1,
  };
  const scholar = (input.scholarlyTop ?? []).filter(Boolean);
  const scholarItems = Array.isArray(input.scholarlyItems) ? input.scholarlyItems : [];
  const provider = (input.insights ?? []).filter(Boolean);

  const items = (input.candidates || []).map((c, idx): AggregatedCandidate => {
    const title = String(c.title || `Theme ${idx + 1}`).trim();
    // Estimate feasibility/novelty from evidence when missing
    const fea = c.feasibility ?? scoreFeasibility([...provider, ...scholar]);
    const nov = c.novelty ?? scoreNovelty([...provider, ...scholar, title]);
    let risk = clamp01(c.risk ?? (1 - fea) * 0.5);
    const rank = w.novelty * nov + w.feasibility * fea - w.risk * risk;
    const evidence: AggregatedCandidate['evidence'] = [];
    provider.slice(0, 3).forEach((t) => evidence.push({ kind: 'provider', text: t }));
    if (scholarItems.length > 0) {
      scholarItems.slice(0, 3).forEach((it) => {
        const atxt = Array.isArray(it.author)
          ? it.author
              .filter(Boolean)
              .slice(0, 3)
              .map((a) => (a?.family ? a.family : (a?.given || ''))) // prefer family name
              .filter(Boolean)
              .join(', ')
          : '';
        const text = it.title ? (atxt ? `${it.title} — ${atxt}` : String(it.title)) : (atxt || '');
        if (text) evidence.push({ kind: 'scholar', text });
      });
    } else {
      scholar.slice(0, 3).forEach((t) => evidence.push({ kind: 'scholar', text: t }));
    }
    return {
      id: String(c.id || `t${idx + 1}`),
      title,
      novelty: clamp01(nov),
      feasibility: clamp01(fea),
      risk,
      summary: c.summary,
      evidence,
      rank,
    };
  });

  // Deduplicate by normalized title (very simple; future: embedding similarity)
  const seen = new Set<string>();
  const deduped: AggregatedCandidate[] = [];
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  deduped.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  return deduped.slice(0, topK);
}
