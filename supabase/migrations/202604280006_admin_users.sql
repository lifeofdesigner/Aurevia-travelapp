create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('super_admin', 'admin', 'agent', 'support')),
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.admin_users(id) on delete set null
);

create index if not exists admin_users_role_active_idx
  on public.admin_users (role, is_active, created_at desc);

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (
    select au.role
    from public.admin_users as au
    where au.id = auth.uid()
      and au.is_active
    limit 1
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_admin_role() in ('super_admin', 'admin', 'agent', 'support'),
    false
  );
$$;

insert into public.admin_users (
  id,
  email,
  full_name,
  role,
  is_active,
  last_login,
  created_at,
  created_by
)
select
  p.user_id,
  p.email,
  nullif(concat_ws(' ', p.first_name, p.last_name), ''),
  case p.role
    when 'owner' then 'super_admin'
    when 'admin' then 'admin'
    when 'support' then 'support'
    else null
  end,
  not coalesce(p.is_suspended, false),
  p.last_signed_in_at,
  p.created_at,
  null
from public.profiles as p
where p.role in ('owner', 'admin', 'support')
  and p.deleted_at is null
on conflict (id) do nothing;

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_admin_read" on public.admin_users;
create policy "admin_users_admin_read"
on public.admin_users
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "admin_users_super_admin_manage" on public.admin_users;
create policy "admin_users_super_admin_manage"
on public.admin_users
for all
to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');
