create index if not exists bookings_admin_status_type_idx
  on public.bookings (primary_booking_type, status, created_at desc)
  where deleted_at is null;

create index if not exists visa_applications_status_updated_idx
  on public.visa_applications (status, updated_at desc)
  where deleted_at is null;

create index if not exists support_tickets_status_priority_idx
  on public.support_tickets (status, priority, created_at desc)
  where deleted_at is null;

create index if not exists data_requests_assignee_status_idx
  on public.data_requests (assigned_admin_user_id, status, created_at desc);

create index if not exists uploads_linked_entity_private_idx
  on public.uploads (linked_entity_type, linked_entity_id, is_private, created_at desc)
  where deleted_at is null;

create index if not exists audit_logs_action_entity_idx
  on public.audit_logs (action, entity_type, entity_id, created_at desc);

create or replace function public.finalize_paid_checkout_session(
  p_booking_id uuid,
  p_user_id uuid,
  p_provider_session_id text,
  p_provider_payment_reference text,
  p_currency_code public.currency_code,
  p_amount_total_minor public.money_minor,
  p_metadata jsonb default '{}'::jsonb,
  p_completed_at timestamptz default timezone('utc', now())
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
    'stripe',
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
  'Atomically finalizes checkout-session backed payment capture, booking confirmation, and item confirmation.';

create or replace function public.mark_checkout_session_payment_terminal(
  p_booking_id uuid,
  p_user_id uuid,
  p_provider_session_id text,
  p_next_status public.payment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_next_status not in ('failed', 'expired', 'cancelled') then
    raise exception 'Unsupported terminal payment status: %', p_next_status;
  end if;

  update public.checkout_sessions
  set status = p_next_status
  where provider_session_id = p_provider_session_id
    and booking_id = p_booking_id
    and user_id = p_user_id;

  update public.bookings
  set
    expires_at = case
      when p_next_status = 'expired'
        then least(coalesce(expires_at, timezone('utc', now())), timezone('utc', now()))
      else expires_at
    end,
    payment_status = p_next_status,
    status = case
      when p_next_status = 'expired' then 'expired'
      else status
    end
  where id = p_booking_id
    and customer_user_id = p_user_id;
end;
$$;

comment on function public.mark_checkout_session_payment_terminal is
  'Atomically marks failed or expired checkout sessions and keeps the umbrella booking state in sync.';

create or replace function public.apply_booking_refund_status(
  p_payment_id uuid,
  p_booking_id uuid,
  p_refunded_amount_minor public.money_minor,
  p_next_payment_status public.payment_status,
  p_next_booking_status public.booking_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    amount_refunded_minor = p_refunded_amount_minor,
    status = p_next_payment_status
  where id = p_payment_id
    and booking_id = p_booking_id;

  update public.bookings
  set
    payment_status = p_next_payment_status,
    status = p_next_booking_status
  where id = p_booking_id;
end;
$$;

comment on function public.apply_booking_refund_status is
  'Atomically applies payment-refund totals and keeps the umbrella booking payment state aligned.';
