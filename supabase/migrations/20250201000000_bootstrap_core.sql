-- Bootstrap core auth helpers and domain tables
set check_function_bodies = off;

-- Helper functions ----------------------------------------------------------

drop function if exists auth.has_pack(text);
drop function if exists auth.is_admin();

create or replace function auth.is_admin()
returns boolean
language sql
stable
as
$$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function auth.has_pack(target text)
returns boolean
language sql
stable
as
$$
  select
    auth.is_admin()
    or exists (
      select 1
      from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'packs', '[]'::jsonb)) as pack(value)
      where pack.value = target
    );
$$;

-- Core tables ---------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add constraint if not exists profiles_owner_unique unique (owner_id);

create index if not exists profiles_owner_idx on public.profiles(owner_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_owner_idx on public.projects(owner_id);

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists designs_owner_idx on public.designs(owner_id);
create index if not exists designs_project_idx on public.designs(project_id);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists templates_owner_idx on public.templates(owner_id);

-- Row level security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.designs enable row level security;
alter table public.templates enable row level security;

drop policy if exists "Profiles are viewable by owner or admin" on public.profiles;
drop policy if exists "Profiles are manageable by owner or admin" on public.profiles;

create policy "Profiles are viewable by owner or admin" on public.profiles
  for select
  using (owner_id = auth.uid() or auth.is_admin());

create policy "Profiles are manageable by owner or admin" on public.profiles
  for all
  using (owner_id = auth.uid() or auth.is_admin())
  with check (owner_id = auth.uid() or auth.is_admin());

drop policy if exists "Projects are viewable by owner or admin" on public.projects;
drop policy if exists "Projects are manageable by owner or admin" on public.projects;

create policy "Projects are viewable by owner or admin" on public.projects
  for select
  using (owner_id = auth.uid() or auth.is_admin());

create policy "Projects are manageable by owner or admin" on public.projects
  for all
  using (owner_id = auth.uid() or auth.is_admin())
  with check (owner_id = auth.uid() or auth.is_admin());

drop policy if exists "Designs are viewable by owner or admin" on public.designs;
drop policy if exists "Designs are manageable by owner or admin" on public.designs;

create policy "Designs are viewable by owner or admin" on public.designs
  for select
  using (owner_id = auth.uid() or auth.is_admin());

create policy "Designs are manageable by owner or admin" on public.designs
  for all
  using (owner_id = auth.uid() or auth.is_admin())
  with check (owner_id = auth.uid() or auth.is_admin());

drop policy if exists "Templates are readable by everyone" on public.templates;
drop policy if exists "Templates are manageable by admins" on public.templates;

create policy "Templates are readable by everyone" on public.templates
  for select
  using (true);

create policy "Templates are manageable by admins" on public.templates
  for all
  using (auth.is_admin())
  with check (auth.is_admin());

-- Seed placeholders (replace <<USER_ID>> with an actual UUID before executing)

insert into public.profiles (owner_id, display_name)
values ('<<USER_ID>>'::uuid, 'Initial Admin Profile')
on conflict (owner_id) do nothing;

insert into public.projects (owner_id, name, description)
values ('<<USER_ID>>'::uuid, 'Welcome Project', 'Example project created during bootstrap')
on conflict do nothing;
