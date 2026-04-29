alter table public.checkout_sessions
drop constraint if exists checkout_sessions_provider_check;

alter table public.checkout_sessions
add constraint checkout_sessions_provider_check
check (provider in ('stripe', 'paystack', 'bank_transfer', 'flutterwave', 'korapay', 'manual'));

alter table public.payments
drop constraint if exists payments_provider_check;

alter table public.payments
add constraint payments_provider_check
check (provider in ('stripe', 'paystack', 'bank_transfer', 'flutterwave', 'korapay', 'manual'));

alter table public.payment_webhook_events
drop constraint if exists payment_webhook_events_provider_check;

alter table public.payment_webhook_events
add constraint payment_webhook_events_provider_check
check (provider in ('stripe', 'paystack', 'flutterwave', 'korapay'));

drop function if exists public.finalize_paid_checkout_session(
  uuid,
  uuid,
  text,
  text,
  public.currency_code,
  public.money_minor,
  jsonb,
  timestamptz
);

create or replace function public.finalize_paid_checkout_session(
  p_booking_id uuid,
  p_user_id uuid,
  p_provider_session_id text,
  p_provider_payment_reference text,
  p_currency_code public.currency_code,
  p_amount_total_minor public.money_minor,
  p_metadata jsonb default '{}'::jsonb,
  p_completed_at timestamptz default timezone('utc', now()),
  p_provider text default 'stripe'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkout_session_id uuid;
  v_payment_id uuid;
begin
  if p_provider not in ('stripe', 'paystack', 'bank_transfer', 'flutterwave', 'korapay', 'manual') then
    raise exception 'Unsupported payment provider: %', p_provider;
  end if;

  select cs.id
  into v_checkout_session_id
  from public.checkout_sessions as cs
  where cs.provider_session_id = p_provider_session_id
    and cs.booking_id = p_booking_id
    and cs.user_id = p_user_id
  limit 1;

  insert into public.payments (
    amount_authorized_minor,
    amount_captured_minor,
    amount_refunded_minor,
    booking_id,
    checkout_session_id,
    currency_code,
    metadata,
    paid_at,
    provider,
    provider_fee_minor,
    provider_payment_reference,
    status,
    user_id
  )
  values (
    p_amount_total_minor,
    p_amount_total_minor,
    0,
    p_booking_id,
    v_checkout_session_id,
    p_currency_code,
    coalesce(p_metadata, '{}'::jsonb),
    p_completed_at,
    p_provider,
    0,
    p_provider_payment_reference,
    'paid',
    p_user_id
  )
  on conflict (provider_payment_reference)
  do update
  set
    amount_authorized_minor = excluded.amount_authorized_minor,
    amount_captured_minor = excluded.amount_captured_minor,
    booking_id = excluded.booking_id,
    checkout_session_id = excluded.checkout_session_id,
    currency_code = excluded.currency_code,
    metadata = excluded.metadata,
    paid_at = excluded.paid_at,
    provider = excluded.provider,
    status = excluded.status,
    updated_at = timezone('utc', now()),
    user_id = excluded.user_id
  returning id into v_payment_id;

  update public.checkout_sessions
  set
    completed_at = p_completed_at,
    status = 'paid'
  where provider_session_id = p_provider_session_id
    and booking_id = p_booking_id
    and user_id = p_user_id;

  update public.bookings
  set
    confirmed_at = coalesce(confirmed_at, p_completed_at),
    payment_status = 'paid',
    status = 'confirmed'
  where id = p_booking_id
    and customer_user_id = p_user_id;

  update public.booking_items
  set
    confirmed_at = coalesce(confirmed_at, p_completed_at),
    status = 'confirmed'
  where booking_id = p_booking_id;

  return v_payment_id;
end;
$$;

comment on function public.finalize_paid_checkout_session is
  'Atomically finalizes checkout-session backed payment capture, booking confirmation, and item confirmation for the selected provider.';
