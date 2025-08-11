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

-- RLS policies are to be added in Supabase (not included here).
