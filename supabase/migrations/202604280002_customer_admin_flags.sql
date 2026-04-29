alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz;

create index if not exists profiles_suspended_deleted_idx
  on public.profiles (is_suspended, deleted_at);
