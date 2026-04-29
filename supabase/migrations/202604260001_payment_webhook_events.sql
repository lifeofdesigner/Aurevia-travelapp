create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe' check (provider in ('stripe')),
  event_type text not null,
  external_event_id text not null unique,
  signature text,
  payload jsonb not null,
  processing_status text not null default 'received' check (
    processing_status in ('received', 'processed', 'failed', 'ignored')
  ),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger payment_webhook_events_set_updated_at
before update on public.payment_webhook_events
for each row execute function public.set_updated_at();

create index payment_webhook_events_provider_status_idx
  on public.payment_webhook_events (provider, processing_status, created_at desc);

comment on table public.payment_webhook_events is
  'Server-ingested payment provider webhooks. Intended for trusted server workflows only.';
