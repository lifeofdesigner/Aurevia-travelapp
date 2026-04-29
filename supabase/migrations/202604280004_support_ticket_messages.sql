create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  visibility text not null default 'customer' check (visibility in ('customer', 'internal')),
  delivery_channel text not null default 'portal' check (delivery_channel in ('email', 'portal', 'system')),
  message_body text not null,
  emailed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger support_ticket_messages_set_updated_at
before update on public.support_ticket_messages
for each row execute function public.set_updated_at();

create index support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

create policy "support_ticket_messages_owner_read"
on public.support_ticket_messages
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.support_tickets as st
    where st.id = ticket_id
      and st.owner_user_id = auth.uid()
  )
);

create policy "support_ticket_messages_staff_insert"
on public.support_ticket_messages
for insert
to authenticated
with check (public.is_staff());
