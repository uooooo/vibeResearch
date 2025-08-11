-- vibeResearch initial schema
-- Extensions
create extension if not exists pgcrypto; -- for gen_random_uuid()
create extension if not exists vector;   -- for pgvector embeddings

-- Tables
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  source_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  idx int not null default 0,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  status text default 'draft',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null, -- 'theme' | 'plan' | 'export' etc
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.tool_invocations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  cost_usd numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_chunks_document on public.chunks(document_id);
create index if not exists idx_plans_project on public.plans(project_id);
create index if not exists idx_runs_project on public.runs(project_id);
create index if not exists idx_tool_invocations_run on public.tool_invocations(run_id);
create index if not exists idx_results_run on public.results(run_id);

-- RLS
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.plans enable row level security;
alter table public.runs enable row level security;
alter table public.tool_invocations enable row level security;
alter table public.citations enable row level security;
alter table public.results enable row level security;

-- Helper: check ownership by project
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = auth.uid()
  );
$$;

-- Policies: projects (owner based)
drop policy if exists project_owner_select on public.projects;
create policy project_owner_select on public.projects
  for select using (owner_id = auth.uid());

drop policy if exists project_owner_modify on public.projects;
create policy project_owner_modify on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Policies: documents
drop policy if exists documents_owner_all on public.documents;
create policy documents_owner_all on public.documents
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- Policies: chunks (via document -> project)
drop policy if exists chunks_owner_all on public.chunks;
create policy chunks_owner_all on public.chunks
  for all using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_project_owner(d.project_id)
    )
  ) with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_project_owner(d.project_id)
    )
  );

-- Policies: plans, runs, tool_invocations, results
drop policy if exists plans_owner_all on public.plans;
create policy plans_owner_all on public.plans
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists runs_owner_all on public.runs;
create policy runs_owner_all on public.runs
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists tool_invocations_owner_all on public.tool_invocations;
create policy tool_invocations_owner_all on public.tool_invocations
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

drop policy if exists citations_owner_all on public.citations;
create policy citations_owner_all on public.citations
  for all using (
    document_id is null or exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_project_owner(d.project_id)
    )
  ) with check (
    document_id is null or exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_project_owner(d.project_id)
    )
  );

