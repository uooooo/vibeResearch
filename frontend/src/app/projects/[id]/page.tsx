import Link from "next/link";

async function getData(projectId: string) {
  const runsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_ORIGIN || ''}/api/runs?projectId=${projectId}`, { cache: 'no-store' });
  const resultsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_ORIGIN || ''}/api/results?projectId=${projectId}&type=plan`, { cache: 'no-store' });
  const runs = await runsRes.json().catch(() => ({ ok: false, items: [] }));
  const results = await resultsRes.json().catch(() => ({ ok: false, items: [] }));
  return { runs, results };
}

export default async function ProjectPage(props: any) {
  const id = props?.params?.id as string;
  const { runs, results } = await getData(id);
  const latestPlan = Array.isArray(results.items) ? results.items[0] : null;
  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project</h1>
        <Link href="/projects" className="text-sm underline">Back</Link>
      </div>
      <div className="grid gap-3">
        <h2 className="text-lg font-medium">Latest Plan</h2>
        {!latestPlan && <div className="text-sm text-foreground/60">No plan results yet.</div>}
        {latestPlan && (
          <div className="rounded-lg border border-white/15 bg-black/30 p-3">
            <div className="text-sm"><span className="font-medium">Title:</span> {latestPlan.meta_json?.title}</div>
            <ul className="text-sm grid gap-1 mt-2">
              <li><span className="font-medium">RQ:</span> {latestPlan.meta_json?.rq}</li>
              <li><span className="font-medium">Hypothesis:</span> {latestPlan.meta_json?.hypothesis}</li>
              <li><span className="font-medium">Data:</span> {latestPlan.meta_json?.data}</li>
              <li><span className="font-medium">Methods:</span> {latestPlan.meta_json?.methods}</li>
              <li><span className="font-medium">Identification:</span> {latestPlan.meta_json?.identification}</li>
              <li><span className="font-medium">Validation:</span> {latestPlan.meta_json?.validation}</li>
              <li><span className="font-medium">Ethics:</span> {latestPlan.meta_json?.ethics}</li>
            </ul>
          </div>
        )}
      </div>
      <div className="grid gap-3">
        <h2 className="text-lg font-medium">Runs</h2>
        <div className="rounded-lg border border-white/15 bg-black/30 p-3">
          <ul className="text-sm grid gap-2">
            {Array.isArray(runs.items) && runs.items.length > 0 ? runs.items.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between">
                <span className="text-foreground/80">{r.kind} · {r.status}</span>
                <span className="text-foreground/60 text-xs">{r.started_at ? new Date(r.started_at).toLocaleString() : ''}</span>
              </li>
            )) : (
              <li className="text-foreground/60">No runs yet.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

