create table public.visa_products (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on update cascade,
  locale public.locale_code not null,
  service_code text not null,
  slug text not null,
  title text not null,
  summary text,
  content_markdown text,
  requirement_summary text,
  processing_timeline_summary text,
  price_from_minor public.money_minor not null default 0,
  currency_code public.currency_code not null default 'EUR',
  supports_dependents boolean not null default false,
  processing_days_min integer check (processing_days_min is null or processing_days_min > 0),
  processing_days_max integer check (
    processing_days_max is null
    or processing_days_min is null
    or processing_days_max >= processing_days_min
  ),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  requirements jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (service_code, locale),
  unique (slug, locale)
);

create index visa_products_country_locale_idx
  on public.visa_products (country_code, locale)
  where deleted_at is null;

create index visa_products_published_sort_idx
  on public.visa_products (is_published, sort_order, created_at desc)
  where deleted_at is null;

create trigger visa_products_set_updated_at
before update on public.visa_products
for each row execute function public.set_updated_at();
