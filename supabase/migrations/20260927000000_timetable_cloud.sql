create table if not exists public.timetable_documents (
  id text primary key,
  name text not null default 'Official Timetable',
  version bigint not null default 1,
  data jsonb not null default '{"classes":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.timetable_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.timetable_documents enable row level security;
alter table public.timetable_admins enable row level security;

revoke all on public.timetable_documents from anon, authenticated;
revoke all on public.timetable_admins from anon, authenticated;
grant select on public.timetable_documents to anon, authenticated;
grant select, insert, update, delete on public.timetable_documents to authenticated;
grant select on public.timetable_admins to authenticated;

create or replace function public.is_timetable_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.timetable_admins
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_timetable_admin() from public;
grant execute on function public.is_timetable_admin() to authenticated;

drop policy if exists "public can read official timetable" on public.timetable_documents;
create policy "public can read official timetable"
on public.timetable_documents
for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert timetable" on public.timetable_documents;
create policy "admins can insert timetable"
on public.timetable_documents
for insert
to authenticated
with check ((select public.is_timetable_admin()));

drop policy if exists "admins can update timetable" on public.timetable_documents;
create policy "admins can update timetable"
on public.timetable_documents
for update
to authenticated
using ((select public.is_timetable_admin()))
with check ((select public.is_timetable_admin()));

drop policy if exists "admins can delete timetable" on public.timetable_documents;
create policy "admins can delete timetable"
on public.timetable_documents
for delete
to authenticated
using ((select public.is_timetable_admin()));

drop policy if exists "admins can read admin list" on public.timetable_admins;
create policy "admins can read admin list"
on public.timetable_admins
for select
to authenticated
using ((select auth.uid()) = user_id or (select public.is_timetable_admin()));

insert into public.timetable_documents (id, name, version, data)
values ('default', 'Official Timetable', 1, '{"classes":[]}'::jsonb)
on conflict (id) do nothing;
