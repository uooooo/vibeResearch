-- Align `projects` table with frontend expectations
-- Adds `title`, `domain` and an insert trigger to set `owner_id` from auth.uid()

-- Columns: add if missing
alter table public.projects add column if not exists title text;
alter table public.projects add column if not exists domain text;

-- Backfill title from legacy `name` if present
update public.projects set title = coalesce(title, name);

-- Simple helper trigger to ensure owner_id defaults to auth.uid() on insert
create or replace function public.set_project_owner_on_insert()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_set_owner on public.projects;
create trigger trg_projects_set_owner
before insert on public.projects
for each row execute procedure public.set_project_owner_on_insert();

-- Optional: simple index on domain for filtering (no-op if exists)
create index if not exists idx_projects_domain on public.projects(domain);

