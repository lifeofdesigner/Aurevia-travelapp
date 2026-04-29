alter table public.checkout_sessions
drop constraint if exists checkout_sessions_provider_check;

alter table public.checkout_sessions
add constraint checkout_sessions_provider_check
check (provider in ('stripe', 'paystack', 'manual'));

alter table public.payments
drop constraint if exists payments_provider_check;

alter table public.payments
add constraint payments_provider_check
check (provider in ('stripe', 'paystack', 'manual'));

alter table public.payment_webhook_events
drop constraint if exists payment_webhook_events_provider_check;

alter table public.payment_webhook_events
add constraint payment_webhook_events_provider_check
check (provider in ('stripe', 'paystack'));
