-- Minimal schema sketch for Supabase (PostgreSQL + pgvector)

create extension if not exists vector;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  domain text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_type text not null,
  url text,
  doi text,
  sha256 text,
  metadata_json jsonb
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  section text,
  start int,
  "end" int,
  text text not null,
  text_hash text,
  embedding vector(1536)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  yaml_json jsonb not null,
  version text,
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null,
  model text,
  status text not null,
  started_at timestamptz,
  ended_at timestamptz,
  cost_usd numeric
);

create table if not exists tool_invocations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  tool text not null,
  args_json jsonb,
  result_meta jsonb,
  latency_ms int
);

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  claim_id uuid,
  paper_id text,
  section text,
  start int,
  "end" int,
  passage_hash text
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  type text not null,
  uri text not null,
  meta_json jsonb,
  created_at timestamptz not null default now()
);

-- Theme exploration: candidates proposed during a run
create table if not exists run_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  title text not null,
  novelty numeric,
  risk numeric,
  created_at timestamptz not null default now()
);

-- Row Level Security (RLS) policies (to be applied in Supabase)
-- NOTE: Service Role bypasses RLS; app code must not expose these endpoints to untrusted callers.

alter table projects enable row level security;
alter table runs enable row level security;
alter table run_candidates enable row level security;
alter table results enable row level security;

-- Project owner can manage their projects
create policy if not exists "projects_owner_select" on projects for select using (owner_id = auth.uid());
create policy if not exists "projects_owner_modify" on projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Runs: owner via project
create policy if not exists "runs_owner_select" on runs for select using (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid()));
create policy if not exists "runs_owner_modify" on runs for all using (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid()));

-- Run candidates: owner via run → project
create policy if not exists "run_candidates_owner_select" on run_candidates for select using (exists (select 1 from runs r join projects p on p.id = r.project_id where r.id = run_candidates.run_id and p.owner_id = auth.uid()));
create policy if not exists "run_candidates_owner_modify" on run_candidates for all using (exists (select 1 from runs r join projects p on p.id = r.project_id where r.id = run_candidates.run_id and p.owner_id = auth.uid())) with check (exists (select 1 from runs r join projects p on p.id = r.project_id where r.id = run_candidates.run_id and p.owner_id = auth.uid()));

-- Results: owner via project
create policy if not exists "results_owner_select" on results for select using (exists (select 1 from projects p where p.id = results.project_id and p.owner_id = auth.uid()));
create policy if not exists "results_owner_modify" on results for all using (exists (select 1 from projects p where p.id = results.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from projects p where p.id = results.project_id and p.owner_id = auth.uid()));

-- Optional: trigger to set projects.owner_id to auth.uid() on insert when not provided
-- create function set_project_owner() returns trigger as $$
-- begin
--   if new.owner_id is null then new.owner_id := auth.uid(); end if;
--   return new;
-- end; $$ language plpgsql security definer;
-- create trigger trg_set_project_owner before insert on projects for each row execute procedure set_project_owner();

-- RLS policies are to be added in Supabase (not included here).
