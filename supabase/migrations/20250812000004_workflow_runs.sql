-- Store mapping between app runs and Mastra workflow runs (for resume)

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  mastra_workflow_id text not null,
  mastra_run_id text not null,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_runs_run on public.workflow_runs(run_id);
create index if not exists idx_workflow_runs_mastra on public.workflow_runs(mastra_workflow_id, mastra_run_id);

-- trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workflow_runs_updated on public.workflow_runs;
create trigger trg_workflow_runs_updated
before update on public.workflow_runs
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.workflow_runs enable row level security;

drop policy if exists workflow_runs_owner_all on public.workflow_runs;
create policy workflow_runs_owner_all on public.workflow_runs
  for all using (
    exists (
      select 1 from public.runs r
      where r.id = run_id and public.is_project_owner(r.project_id)
    )
  ) with check (
    exists (
      select 1 from public.runs r
      where r.id = run_id and public.is_project_owner(r.project_id)
    )
  );

