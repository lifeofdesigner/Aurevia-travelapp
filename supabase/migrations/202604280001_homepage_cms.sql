create table if not exists public.homepage_hero (
  id uuid primary key default gen_random_uuid(),
  headline text not null default '',
  subheadline text not null default '',
  cta_text text not null default '',
  cta_link text not null default '',
  bg_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cta_text text,
  cta_link text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.homepage_destinations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  image_url text,
  price_label text,
  hotels_count integer,
  link text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (hotels_count is null or hotels_count >= 0)
);

create table if not exists public.homepage_deals (
  id uuid primary key default gen_random_uuid(),
  origin_code text not null check (origin_code ~ '^[A-Z0-9]{3}$'),
  origin_city text not null,
  destination_code text not null check (destination_code ~ '^[A-Z0-9]{3}$'),
  destination_city text not null,
  price public.money_minor not null,
  currency public.currency_code not null,
  airline_name text not null,
  image_url text,
  fare_type text,
  expires_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.homepage_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists homepage_banners_sort_order_idx
  on public.homepage_banners (sort_order, is_active, starts_at, ends_at);

create index if not exists homepage_destinations_sort_order_idx
  on public.homepage_destinations (sort_order, is_active);

create index if not exists homepage_deals_sort_order_idx
  on public.homepage_deals (sort_order, is_active, expires_at);

drop trigger if exists homepage_hero_set_updated_at on public.homepage_hero;
create trigger homepage_hero_set_updated_at
before update on public.homepage_hero
for each row execute function public.set_updated_at();

drop trigger if exists homepage_banners_set_updated_at on public.homepage_banners;
create trigger homepage_banners_set_updated_at
before update on public.homepage_banners
for each row execute function public.set_updated_at();

drop trigger if exists homepage_destinations_set_updated_at on public.homepage_destinations;
create trigger homepage_destinations_set_updated_at
before update on public.homepage_destinations
for each row execute function public.set_updated_at();

drop trigger if exists homepage_deals_set_updated_at on public.homepage_deals;
create trigger homepage_deals_set_updated_at
before update on public.homepage_deals
for each row execute function public.set_updated_at();

drop trigger if exists homepage_settings_set_updated_at on public.homepage_settings;
create trigger homepage_settings_set_updated_at
before update on public.homepage_settings
for each row execute function public.set_updated_at();

alter table public.homepage_hero enable row level security;
alter table public.homepage_banners enable row level security;
alter table public.homepage_destinations enable row level security;
alter table public.homepage_deals enable row level security;
alter table public.homepage_settings enable row level security;

drop policy if exists "homepage_hero_public_read" on public.homepage_hero;
create policy "homepage_hero_public_read"
on public.homepage_hero
for select
to anon, authenticated
using (true);

drop policy if exists "homepage_hero_admin_manage" on public.homepage_hero;
create policy "homepage_hero_admin_manage"
on public.homepage_hero
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "homepage_banners_public_read" on public.homepage_banners;
create policy "homepage_banners_public_read"
on public.homepage_banners
for select
to anon, authenticated
using (
  is_active
  and (starts_at is null or starts_at <= timezone('utc', now()))
  and (ends_at is null or ends_at >= timezone('utc', now()))
);

drop policy if exists "homepage_banners_admin_manage" on public.homepage_banners;
create policy "homepage_banners_admin_manage"
on public.homepage_banners
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "homepage_destinations_public_read" on public.homepage_destinations;
create policy "homepage_destinations_public_read"
on public.homepage_destinations
for select
to anon, authenticated
using (is_active);

drop policy if exists "homepage_destinations_admin_manage" on public.homepage_destinations;
create policy "homepage_destinations_admin_manage"
on public.homepage_destinations
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "homepage_deals_public_read" on public.homepage_deals;
create policy "homepage_deals_public_read"
on public.homepage_deals
for select
to anon, authenticated
using (
  is_active
  and (expires_at is null or expires_at >= timezone('utc', now()))
);

drop policy if exists "homepage_deals_admin_manage" on public.homepage_deals;
create policy "homepage_deals_admin_manage"
on public.homepage_deals
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "homepage_settings_public_read" on public.homepage_settings;
create policy "homepage_settings_public_read"
on public.homepage_settings
for select
to anon, authenticated
using (true);

drop policy if exists "homepage_settings_admin_manage" on public.homepage_settings;
create policy "homepage_settings_admin_manage"
on public.homepage_settings
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

insert into public.homepage_settings (key, value)
values
  (
    'trust_items',
    '["IATA Accredited","Secure Payments","24/7 Concierge","Best Price Guarantee","Multi-currency"]'
  ),
  (
    'stats',
    '[{"value":"5","label":"Supported currencies"},{"value":"20%","label":"Avg discount"},{"value":"GDPR","label":"Privacy compliant"}]'
  ),
  (
    'why_text',
    '{"headline":"Built to feel calm, precise, and internationally credible","description":"We align timing, suppliers, traveler details, and commercial clarity so your trip feels settled before departure and dependable after landing."}'
  ),
  (
    'cta_text',
    '{"headline":"Travel better. Worry less.","description":"Speak with Aurevia Travel for concierge-style planning across flights, hotels, visas, and ground movement."}'
  )
on conflict (key) do update
set
  value = excluded.value,
  updated_at = timezone('utc', now());
