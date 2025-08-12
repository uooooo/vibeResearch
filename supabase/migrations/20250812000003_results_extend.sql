-- Extend results table with project_id, type, uri, meta_json
-- and backfill from existing data safely under RLS-enabled environment.

-- Columns (nullable to allow backfill, then tighten as needed)
alter table public.results add column if not exists project_id uuid;
alter table public.results add column if not exists type text;
alter table public.results add column if not exists uri text;
alter table public.results add column if not exists meta_json jsonb;

-- Backfill meta_json from content
update public.results set meta_json = coalesce(meta_json, content);

-- Backfill project_id by joining runs
update public.results r
set project_id = coalesce(r.project_id, ru.project_id)
from public.runs ru
where ru.id = r.run_id;

-- Helpful indexes
create index if not exists idx_results_project on public.results(project_id);
create index if not exists idx_results_type on public.results(type);
create index if not exists idx_results_project_type on public.results(project_id, type);

-- RLS Policy refinement: allow via project_id or via run->project ownership
drop policy if exists results_owner_all on public.results;
create policy results_owner_all on public.results
  for all using (
    -- direct project ownership if set
    (project_id is not null and public.is_project_owner(project_id))
    or
    -- fallback: owner via joined run
    exists (
      select 1 from public.runs r
      where r.id = run_id and public.is_project_owner(r.project_id)
    )
  )
  with check (
    (project_id is not null and public.is_project_owner(project_id))
    or exists (
      select 1 from public.runs r
      where r.id = run_id and public.is_project_owner(r.project_id)
    )
  );

