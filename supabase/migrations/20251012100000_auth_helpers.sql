create or replace function auth.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function auth.has_pack(target text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    where target is not null
      and jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'packs') = 'array'
      and (auth.jwt() -> 'app_metadata' -> 'packs') ? target
  );
$$;

alter table public.projects enable row level security;

drop policy if exists "projects_read_owner_admin_studio" on public.projects;
drop policy if exists "projects_write_owner_admin" on public.projects;
drop policy if exists "projects_update_owner_admin" on public.projects;
drop policy if exists "projects_delete_admin" on public.projects;

create policy "projects_read_owner_admin_studio" on public.projects
for select
using (
  auth.uid() = user_id
  or auth.is_admin()
  or auth.has_pack('studio')
);

create policy "projects_write_owner_admin" on public.projects
for insert
with check (
  auth.uid() = user_id or auth.is_admin()
);

create policy "projects_update_owner_admin" on public.projects
for update
using (
  auth.uid() = user_id or auth.is_admin()
);

create policy "projects_delete_admin" on public.projects
for delete
using (
  auth.is_admin()
);
