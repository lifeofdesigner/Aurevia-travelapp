alter table public.payment_webhook_events enable row level security;

create policy "payment_webhook_events_admin_read"
on public.payment_webhook_events
for select
to authenticated
using (public.current_user_role() in ('admin', 'owner'));
