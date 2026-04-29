set check_function_bodies = off;

create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'support', 'admin', 'owner');
create type public.booking_type as enum (
  'flight',
  'hotel',
  'car_rental',
  'airport_transfer',
  'tour',
  'visa'
);
create type public.booking_status as enum (
  'draft',
  'pending',
  'pending_payment',
  'confirmed',
  'partially_confirmed',
  'cancelled',
  'refunded',
  'expired'
);
create type public.payment_status as enum (
  'pending',
  'requires_action',
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
  'expired'
);
create type public.invoice_status as enum (
  'draft',
  'issued',
  'paid',
  'void',
  'refunded',
  'overdue'
);
create type public.currency_code as enum ('EUR', 'USD', 'GBP', 'AED', 'NGN');
create type public.locale_code as enum ('en', 'de');
create type public.flight_trip_type as enum ('one_way', 'round_trip', 'multi_city');
create type public.cabin_class as enum (
  'economy',
  'premium_economy',
  'business',
  'first'
);
create type public.hotel_rate_type as enum (
  'room_only',
  'bed_and_breakfast',
  'half_board',
  'full_board',
  'all_inclusive'
);
create type public.transfer_type as enum (
  'private',
  'shared',
  'luxury',
  'chauffeur',
  'shuttle'
);
create type public.visa_application_status as enum (
  'draft',
  'submitted',
  'in_review',
  'action_required',
  'approved',
  'rejected',
  'cancelled',
  'withdrawn'
);
create type public.consent_type as enum (
  'privacy_policy',
  'terms_of_use',
  'cookie_policy',
  'refund_policy',
  'analytics_cookies',
  'marketing_email',
  'profiling',
  'visa_document_processing'
);
create type public.consent_status as enum (
  'granted',
  'denied',
  'withdrawn',
  'pending'
);
create type public.data_request_type as enum (
  'access',
  'erasure',
  'rectification',
  'portability',
  'restriction',
  'objection'
);
create type public.data_request_status as enum (
  'submitted',
  'verifying_identity',
  'in_progress',
  'fulfilled',
  'rejected',
  'cancelled'
);
create type public.notification_type as enum (
  'booking_update',
  'payment_update',
  'refund_update',
  'visa_update',
  'support_update',
  'system_announcement',
  'legal_update',
  'marketing'
);
create type public.notification_status as enum (
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'archived'
);

create domain public.money_minor as bigint
  check (value >= 0);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_reference(prefix text)
returns text
language plpgsql
volatile
as $$
declare
  token text;
begin
  token := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  return prefix || '-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || token;
end;
$$;

create table public.supported_currencies (
  code public.currency_code primary key,
  display_name text not null,
  symbol text not null,
  decimal_places smallint not null default 2 check (decimal_places between 0 and 4),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  iso3 text not null unique check (iso3 ~ '^[A-Z]{3}$'),
  name text not null,
  localized_names jsonb not null default '{}'::jsonb,
  currency_code public.currency_code not null,
  phone_code text,
  is_schengen boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on update cascade,
  slug text not null unique,
  name text not null,
  localized_names jsonb not null default '{}'::jsonb,
  time_zone text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.airports (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  country_code text not null references public.countries(code) on update cascade,
  iata_code text not null unique check (iata_code ~ '^[A-Z0-9]{3}$'),
  icao_code text unique check (icao_code is null or icao_code ~ '^[A-Z0-9]{4}$'),
  name text not null,
  time_zone text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.airlines (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries(code) on update cascade,
  iata_code text unique check (iata_code is null or iata_code ~ '^[A-Z0-9]{2}$'),
  icao_code text unique check (icao_code is null or icao_code ~ '^[A-Z0-9]{3}$'),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  destination_type text not null check (
    destination_type in ('city', 'country', 'airport', 'region')
  ),
  country_code text not null references public.countries(code) on update cascade,
  city_id uuid references public.cities(id) on delete set null,
  airport_id uuid references public.airports(id) on delete set null,
  title text not null,
  summary text,
  hero_image_url text,
  theme_color text,
  tags text[] not null default '{}'::text[],
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.featured_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  locale public.locale_code not null,
  destination_id uuid references public.destinations(id) on delete set null,
  badge text,
  title text not null,
  summary text,
  body_markdown text,
  cta_label text,
  cta_href text,
  image_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  publish_starts_at timestamptz,
  publish_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (content_key, locale),
  check (publish_ends_at is null or publish_starts_at is null or publish_ends_at > publish_starts_at)
);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null check (
    document_key in ('privacy_policy', 'terms_of_use', 'cookie_policy', 'refund_policy')
  ),
  locale public.locale_code not null,
  version text not null,
  title text not null,
  summary text,
  body_markdown text not null,
  publication_status text not null check (
    publication_status in ('draft', 'published', 'archived')
  ),
  effective_at timestamptz not null,
  published_at timestamptz,
  checksum_sha256 text,
  is_current boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (document_key, locale, version),
  check (
    (publication_status = 'published' and published_at is not null)
    or (publication_status <> 'published')
  )
);

create unique index legal_documents_current_unique
  on public.legal_documents (document_key, locale)
  where is_current;

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  locale public.locale_code,
  setting_value jsonb not null,
  is_public boolean not null default false,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index site_settings_global_key_unique
  on public.site_settings (setting_key)
  where locale is null;

create unique index site_settings_locale_key_unique
  on public.site_settings (setting_key, locale)
  where locale is not null;

create table public.currency_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency public.currency_code not null,
  quote_currency public.currency_code not null,
  rate_value numeric(18, 8) not null check (rate_value > 0),
  rate_date date not null,
  source text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (base_currency, quote_currency, rate_date, source),
  check (base_currency <> quote_currency)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  service_types public.booking_type[] not null default '{}'::public.booking_type[],
  base_url text,
  contact_email text,
  is_active boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cardinality(service_types) > 0)
);

create table public.supplier_credentials (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  credential_key text not null,
  display_name text not null,
  credential_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, environment, credential_key)
);

create table public.supplier_webhook_events (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  event_type text not null,
  external_event_id text not null,
  signature text,
  payload jsonb not null,
  processing_status text not null default 'received' check (
    processing_status in ('received', 'processed', 'failed', 'ignored')
  ),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, external_event_id)
);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  request_scope text not null,
  idempotency_key text not null,
  request_hash text,
  owner_user_id uuid references auth.users(id) on delete set null,
  linked_entity_type text,
  linked_entity_id uuid,
  response_status_code integer,
  response_body jsonb,
  locked_until timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_scope, idempotency_key)
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  bucket_name text not null,
  storage_path text not null,
  file_name text not null,
  file_extension text,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  checksum_sha256 text,
  document_category text not null check (
    document_category in (
      'visa_document',
      'invoice_pdf',
      'ticket_pdf',
      'passport_scan',
      'support_attachment',
      'profile_image',
      'other'
    )
  ),
  linked_entity_type text,
  linked_entity_id uuid,
  is_private boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (bucket_name, storage_path)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  avatar_path text,
  date_of_birth date,
  email_verified_at timestamptz,
  last_signed_in_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  preferred_locale public.locale_code not null default 'en',
  preferred_currency public.currency_code not null default 'EUR',
  time_zone text not null default 'Europe/Vienna',
  marketing_email_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  address_type text not null check (
    address_type in ('billing', 'home', 'office', 'travel', 'other')
  ),
  recipient_name text,
  company_name text,
  line_1 text not null,
  line_2 text,
  city_name text not null,
  state_region text,
  postal_code text,
  country_code text not null references public.countries(code) on update cascade,
  phone text,
  vat_number text,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.traveler_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_label text,
  traveler_type text not null check (traveler_type in ('adult', 'child', 'infant')),
  first_name text not null,
  last_name text not null,
  middle_name text,
  date_of_birth date,
  gender text,
  nationality_country_code text references public.countries(code) on update cascade,
  residence_country_code text references public.countries(code) on update cascade,
  phone text,
  email text,
  loyalty_programs jsonb not null default '[]'::jsonb,
  special_assistance_notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create unique index traveler_profiles_primary_per_owner_unique
  on public.traveler_profiles (owner_user_id)
  where is_primary and deleted_at is null;

create table public.saved_passenger_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  traveler_profile_id uuid not null references public.traveler_profiles(id) on delete cascade,
  upload_id uuid unique references public.uploads(id) on delete set null,
  document_type text not null check (
    document_type in ('passport', 'national_id', 'residence_permit', 'visa', 'driver_license', 'other')
  ),
  issuing_country_code text references public.countries(code) on update cascade,
  document_number_last4 text,
  expires_at date,
  issued_at date,
  metadata jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create unique index saved_passenger_documents_primary_per_type_unique
  on public.saved_passenger_documents (traveler_profile_id, document_type)
  where is_primary and deleted_at is null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  status public.notification_status not null default 'queued',
  channel text not null default 'in_app' check (channel in ('in_app', 'email')),
  title text not null,
  body text not null,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.flight_offer_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  search_hash text not null,
  supplier_offer_id text not null,
  origin_airport_code text not null check (origin_airport_code ~ '^[A-Z0-9]{3}$'),
  destination_airport_code text not null check (destination_airport_code ~ '^[A-Z0-9]{3}$'),
  departure_date date not null,
  return_date date,
  trip_type public.flight_trip_type not null,
  cabin_class public.cabin_class not null,
  passenger_summary jsonb not null default '{}'::jsonb,
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  expires_at timestamptz not null,
  offer_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, search_hash, supplier_offer_id)
);

create table public.hotel_offer_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  search_hash text not null,
  supplier_offer_id text not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  property_name text not null,
  room_name text not null,
  check_in_date date not null,
  check_out_date date not null,
  guest_count integer not null check (guest_count > 0),
  room_count integer not null default 1 check (room_count > 0),
  rate_type public.hotel_rate_type not null,
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  expires_at timestamptz not null,
  offer_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, search_hash, supplier_offer_id),
  check (check_out_date > check_in_date)
);

create table public.car_offer_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  search_hash text not null,
  supplier_offer_id text not null,
  pickup_city_id uuid references public.cities(id) on delete set null,
  dropoff_city_id uuid references public.cities(id) on delete set null,
  pickup_airport_code text check (pickup_airport_code is null or pickup_airport_code ~ '^[A-Z0-9]{3}$'),
  dropoff_airport_code text check (dropoff_airport_code is null or dropoff_airport_code ~ '^[A-Z0-9]{3}$'),
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  vehicle_name text not null,
  vehicle_category text,
  seat_count integer check (seat_count is null or seat_count > 0),
  bag_count integer check (bag_count is null or bag_count >= 0),
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  expires_at timestamptz not null,
  offer_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, search_hash, supplier_offer_id),
  check (return_at > pickup_at)
);

create table public.transfer_offer_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  search_hash text not null,
  supplier_offer_id text not null,
  pickup_city_id uuid references public.cities(id) on delete set null,
  dropoff_city_id uuid references public.cities(id) on delete set null,
  pickup_at timestamptz not null,
  passenger_count integer not null check (passenger_count > 0),
  luggage_count integer not null default 0 check (luggage_count >= 0),
  transfer_type public.transfer_type not null,
  vehicle_name text,
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  expires_at timestamptz not null,
  offer_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, search_hash, supplier_offer_id)
);

create table public.tour_offer_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  search_hash text not null,
  supplier_offer_id text not null,
  destination_id uuid not null references public.destinations(id) on delete cascade,
  service_date date not null,
  category text,
  title text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  expires_at timestamptz not null,
  offer_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, search_hash, supplier_offer_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique default public.generate_reference('AVT'),
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  created_by_user_id uuid references auth.users(id) on delete set null,
  primary_booking_type public.booking_type not null,
  status public.booking_status not null default 'draft',
  payment_status public.payment_status not null default 'pending',
  locale public.locale_code not null default 'en',
  currency_code public.currency_code not null,
  customer_email text not null,
  customer_phone text,
  subtotal_amount_minor public.money_minor not null default 0,
  tax_amount_minor public.money_minor not null default 0,
  discount_amount_minor public.money_minor not null default 0,
  total_amount_minor public.money_minor not null default 0,
  billing_address_snapshot jsonb not null default '{}'::jsonb,
  traveler_summary jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (total_amount_minor = subtotal_amount_minor + tax_amount_minor - discount_amount_minor)
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  booking_type public.booking_type not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status public.booking_status not null default 'draft',
  title text not null,
  description text,
  service_start_at timestamptz,
  service_end_at timestamptz,
  quantity integer not null default 1 check (quantity > 0),
  subtotal_amount_minor public.money_minor not null default 0,
  tax_amount_minor public.money_minor not null default 0,
  discount_amount_minor public.money_minor not null default 0,
  total_amount_minor public.money_minor not null default 0,
  currency_code public.currency_code not null,
  supplier_offer_id text,
  supplier_confirmation_reference text,
  snapshot_payload jsonb not null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (booking_id, position),
  check (service_end_at is null or service_start_at is null or service_end_at >= service_start_at),
  check (total_amount_minor = subtotal_amount_minor + tax_amount_minor - discount_amount_minor)
);

create table public.booking_travelers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_item_id uuid references public.booking_items(id) on delete cascade,
  traveler_profile_id uuid references public.traveler_profiles(id) on delete set null,
  traveler_type text not null check (traveler_type in ('adult', 'child', 'infant')),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  nationality_country_code text references public.countries(code) on update cascade,
  document_number_last4 text,
  traveler_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.flight_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete cascade,
  trip_type public.flight_trip_type not null,
  cabin_class public.cabin_class not null,
  origin_airport_code text not null check (origin_airport_code ~ '^[A-Z0-9]{3}$'),
  destination_airport_code text not null check (destination_airport_code ~ '^[A-Z0-9]{3}$'),
  departure_date date not null,
  return_date date,
  ticketing_deadline_at timestamptz,
  supplier_booking_reference text,
  pnr text,
  fare_rules jsonb not null default '{}'::jsonb,
  baggage_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.flight_segment_snapshots (
  id uuid primary key default gen_random_uuid(),
  flight_booking_id uuid not null references public.flight_bookings(id) on delete cascade,
  segment_index integer not null check (segment_index > 0),
  marketing_airline_code text check (
    marketing_airline_code is null or marketing_airline_code ~ '^[A-Z0-9]{2}$'
  ),
  operating_airline_code text check (
    operating_airline_code is null or operating_airline_code ~ '^[A-Z0-9]{2}$'
  ),
  flight_number text not null,
  origin_airport_code text not null check (origin_airport_code ~ '^[A-Z0-9]{3}$'),
  destination_airport_code text not null check (destination_airport_code ~ '^[A-Z0-9]{3}$'),
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  cabin_class public.cabin_class not null,
  fare_class_code text,
  aircraft_code text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  baggage_allowance jsonb not null default '{}'::jsonb,
  segment_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (flight_booking_id, segment_index),
  check (arrival_at >= departure_at)
);

create table public.hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete cascade,
  property_name text not null,
  property_city_id uuid references public.cities(id) on delete set null,
  property_country_code text references public.countries(code) on update cascade,
  property_address_snapshot jsonb not null default '{}'::jsonb,
  check_in_date date not null,
  check_out_date date not null,
  night_count integer not null check (night_count > 0),
  room_count integer not null default 1 check (room_count > 0),
  guest_count integer not null check (guest_count > 0),
  board_type public.hotel_rate_type not null,
  supplier_booking_reference text,
  cancellation_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (check_out_date > check_in_date)
);

create table public.hotel_room_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel_booking_id uuid not null references public.hotel_bookings(id) on delete cascade,
  room_index integer not null check (room_index > 0),
  room_name text not null,
  rate_type public.hotel_rate_type not null,
  quantity integer not null default 1 check (quantity > 0),
  guest_count integer not null check (guest_count > 0),
  subtotal_amount_minor public.money_minor not null default 0,
  tax_amount_minor public.money_minor not null default 0,
  total_amount_minor public.money_minor not null default 0,
  currency_code public.currency_code not null,
  room_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (hotel_booking_id, room_index),
  check (total_amount_minor = subtotal_amount_minor + tax_amount_minor)
);

create table public.car_rental_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete cascade,
  supplier_booking_reference text,
  pickup_city_id uuid references public.cities(id) on delete set null,
  pickup_airport_code text check (pickup_airport_code is null or pickup_airport_code ~ '^[A-Z0-9]{3}$'),
  pickup_location_label text not null,
  return_city_id uuid references public.cities(id) on delete set null,
  return_airport_code text check (return_airport_code is null or return_airport_code ~ '^[A-Z0-9]{3}$'),
  return_location_label text not null,
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  vehicle_name text not null,
  vehicle_category text,
  transmission_type text,
  fuel_policy text,
  mileage_policy text,
  driver_age_min integer check (driver_age_min is null or driver_age_min > 0),
  insurance_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (return_at > pickup_at)
);

create table public.airport_transfer_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete cascade,
  transfer_type public.transfer_type not null,
  pickup_city_id uuid references public.cities(id) on delete set null,
  dropoff_city_id uuid references public.cities(id) on delete set null,
  pickup_airport_code text check (pickup_airport_code is null or pickup_airport_code ~ '^[A-Z0-9]{3}$'),
  dropoff_airport_code text check (dropoff_airport_code is null or dropoff_airport_code ~ '^[A-Z0-9]{3}$'),
  pickup_at timestamptz not null,
  pickup_location_label text not null,
  dropoff_location_label text not null,
  passenger_count integer not null check (passenger_count > 0),
  luggage_count integer not null default 0 check (luggage_count >= 0),
  vehicle_name text,
  meet_and_greet boolean not null default false,
  supplier_booking_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tour_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  supplier_booking_reference text,
  title text not null,
  service_date date not null,
  starts_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  meeting_point text,
  ticket_delivery_method text,
  inclusions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  cancellation_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.visa_applications (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid unique references public.booking_items(id) on delete set null,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  visa_country_code text not null references public.countries(code) on update cascade,
  applicant_country_code text references public.countries(code) on update cascade,
  status public.visa_application_status not null default 'draft',
  intended_travel_date date,
  appointment_at timestamptz,
  application_reference text,
  form_data jsonb not null default '{}'::jsonb,
  requirements_snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  booking_type public.booking_type not null,
  locale public.locale_code not null,
  currency_code public.currency_code not null,
  origin_query text,
  destination_query text,
  departure_date date,
  return_date date,
  passenger_summary jsonb not null default '{}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  result_count integer not null default 0 check (result_count >= 0),
  converted_booking_id uuid references public.bookings(id) on delete set null,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe', 'manual')),
  provider_session_id text unique,
  idempotency_key text not null unique,
  status public.payment_status not null default 'pending',
  amount_total_minor public.money_minor not null,
  currency_code public.currency_code not null,
  success_url text,
  cancel_url text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  checkout_session_id uuid references public.checkout_sessions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe', 'manual')),
  provider_payment_reference text unique,
  status public.payment_status not null default 'pending',
  amount_authorized_minor public.money_minor not null default 0,
  amount_captured_minor public.money_minor not null default 0,
  amount_refunded_minor public.money_minor not null default 0,
  currency_code public.currency_code not null,
  provider_fee_minor public.money_minor not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (amount_captured_minor <= amount_authorized_minor),
  check (amount_refunded_minor <= amount_captured_minor)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_refund_reference text unique,
  status text not null default 'pending' check (
    status in ('pending', 'succeeded', 'failed', 'cancelled')
  ),
  amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  reason text,
  failure_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null unique default public.generate_reference('INV'),
  status public.invoice_status not null default 'draft',
  billing_address_snapshot jsonb not null default '{}'::jsonb,
  issuer_snapshot jsonb not null default '{}'::jsonb,
  subtotal_amount_minor public.money_minor not null default 0,
  tax_amount_minor public.money_minor not null default 0,
  total_amount_minor public.money_minor not null default 0,
  currency_code public.currency_code not null,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  pdf_upload_id uuid references public.uploads(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (total_amount_minor = subtotal_amount_minor + tax_amount_minor)
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  related_booking_item_id uuid references public.booking_items(id) on delete set null,
  line_index integer not null check (line_index > 0),
  description text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_amount_minor public.money_minor not null,
  subtotal_amount_minor public.money_minor not null,
  total_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (invoice_id, line_index)
);

create table public.tax_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  booking_item_id uuid references public.booking_items(id) on delete cascade,
  tax_name text not null,
  tax_rate numeric(7, 4) not null check (tax_rate between 0 and 1),
  jurisdiction_country_code text references public.countries(code) on update cascade,
  taxable_amount_minor public.money_minor not null,
  tax_amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (invoice_id is not null or booking_item_id is not null)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type text not null check (discount_type in ('fixed_amount', 'percentage')),
  amount_minor public.money_minor,
  percentage_bps integer check (percentage_bps between 1 and 10000),
  currency_code public.currency_code,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  is_active boolean not null default true,
  applicable_booking_types public.booking_type[] not null default '{}'::public.booking_type[],
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (
    (discount_type = 'fixed_amount' and amount_minor is not null and percentage_bps is null and currency_code is not null)
    or (discount_type = 'percentage' and amount_minor is null and percentage_bps is not null)
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (max_redemptions is null or redemption_count <= max_redemptions)
);

create table public.applied_discounts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_item_id uuid references public.booking_items(id) on delete cascade,
  coupon_id uuid references public.coupons(id) on delete set null,
  discount_name text not null,
  discount_type text not null check (discount_type in ('fixed_amount', 'percentage', 'manual')),
  amount_minor public.money_minor not null,
  currency_code public.currency_code not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.cookie_consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  consent_type public.consent_type not null,
  consent_status public.consent_status not null,
  locale public.locale_code not null,
  legal_document_id uuid references public.legal_documents(id) on delete set null,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.privacy_consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  consent_type public.consent_type not null,
  consent_status public.consent_status not null,
  locale public.locale_code not null,
  legal_document_id uuid references public.legal_documents(id) on delete set null,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  assigned_admin_user_id uuid references auth.users(id) on delete set null,
  request_type public.data_request_type not null,
  status public.data_request_status not null default 'submitted',
  requested_email text not null,
  verification_token_hash text,
  request_details jsonb not null default '{}'::jsonb,
  response_summary text,
  rejected_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role public.user_role,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  title text,
  note_body text not null,
  is_visible_to_customer boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default public.generate_reference('SUP'),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  assigned_admin_user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  description text not null,
  priority text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')
  ),
  last_customer_reply_at timestamptz,
  last_admin_reply_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles as p
      where p.user_id = auth.uid()
    ),
    'customer'::public.user_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('support', 'admin', 'owner');
$$;

create or replace function public.is_booking_owner(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as b
    where b.id = target_booking_id
      and b.customer_user_id = auth.uid()
  );
$$;

create or replace function public.is_booking_item_owner(target_booking_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.booking_items as bi
    join public.bookings as b
      on b.id = bi.booking_id
    where bi.id = target_booking_item_id
      and b.customer_user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    email_verified_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    new.email_confirmed_at
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create trigger supported_currencies_set_updated_at
before update on public.supported_currencies
for each row execute function public.set_updated_at();

create trigger countries_set_updated_at
before update on public.countries
for each row execute function public.set_updated_at();

create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

create trigger airports_set_updated_at
before update on public.airports
for each row execute function public.set_updated_at();

create trigger airlines_set_updated_at
before update on public.airlines
for each row execute function public.set_updated_at();

create trigger destinations_set_updated_at
before update on public.destinations
for each row execute function public.set_updated_at();

create trigger featured_content_set_updated_at
before update on public.featured_content
for each row execute function public.set_updated_at();

create trigger legal_documents_set_updated_at
before update on public.legal_documents
for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create trigger currency_rates_set_updated_at
before update on public.currency_rates
for each row execute function public.set_updated_at();

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger supplier_credentials_set_updated_at
before update on public.supplier_credentials
for each row execute function public.set_updated_at();

create trigger supplier_webhook_events_set_updated_at
before update on public.supplier_webhook_events
for each row execute function public.set_updated_at();

create trigger idempotency_keys_set_updated_at
before update on public.idempotency_keys
for each row execute function public.set_updated_at();

create trigger uploads_set_updated_at
before update on public.uploads
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger addresses_set_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

create trigger traveler_profiles_set_updated_at
before update on public.traveler_profiles
for each row execute function public.set_updated_at();

create trigger saved_passenger_documents_set_updated_at
before update on public.saved_passenger_documents
for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create trigger flight_offer_cache_set_updated_at
before update on public.flight_offer_cache
for each row execute function public.set_updated_at();

create trigger hotel_offer_cache_set_updated_at
before update on public.hotel_offer_cache
for each row execute function public.set_updated_at();

create trigger car_offer_cache_set_updated_at
before update on public.car_offer_cache
for each row execute function public.set_updated_at();

create trigger transfer_offer_cache_set_updated_at
before update on public.transfer_offer_cache
for each row execute function public.set_updated_at();

create trigger tour_offer_cache_set_updated_at
before update on public.tour_offer_cache
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger booking_items_set_updated_at
before update on public.booking_items
for each row execute function public.set_updated_at();

create trigger flight_bookings_set_updated_at
before update on public.flight_bookings
for each row execute function public.set_updated_at();

create trigger hotel_bookings_set_updated_at
before update on public.hotel_bookings
for each row execute function public.set_updated_at();

create trigger car_rental_bookings_set_updated_at
before update on public.car_rental_bookings
for each row execute function public.set_updated_at();

create trigger airport_transfer_bookings_set_updated_at
before update on public.airport_transfer_bookings
for each row execute function public.set_updated_at();

create trigger tour_bookings_set_updated_at
before update on public.tour_bookings
for each row execute function public.set_updated_at();

create trigger visa_applications_set_updated_at
before update on public.visa_applications
for each row execute function public.set_updated_at();

create trigger checkout_sessions_set_updated_at
before update on public.checkout_sessions
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger refunds_set_updated_at
before update on public.refunds
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger coupons_set_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

create trigger data_requests_set_updated_at
before update on public.data_requests
for each row execute function public.set_updated_at();

create trigger admin_notes_set_updated_at
before update on public.admin_notes
for each row execute function public.set_updated_at();

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create index countries_active_idx
  on public.countries (is_active);

create index cities_country_slug_idx
  on public.cities (country_code, slug);

create index airports_city_country_idx
  on public.airports (city_id, country_code);

create index airlines_country_active_idx
  on public.airlines (country_code, is_active);

create index destinations_country_city_featured_idx
  on public.destinations (country_code, city_id, is_featured);

create index featured_content_published_idx
  on public.featured_content (locale, is_published, sort_order);

create index legal_documents_lookup_idx
  on public.legal_documents (document_key, locale, publication_status, effective_at desc);

create index currency_rates_lookup_idx
  on public.currency_rates (base_currency, quote_currency, rate_date desc);

create index suppliers_service_types_gin_idx
  on public.suppliers using gin (service_types);

create index supplier_credentials_supplier_idx
  on public.supplier_credentials (supplier_id, environment, is_active);

create index supplier_webhook_events_status_idx
  on public.supplier_webhook_events (supplier_id, processing_status, created_at desc);

create index idempotency_keys_owner_scope_idx
  on public.idempotency_keys (owner_user_id, request_scope, created_at desc);

create index uploads_owner_entity_idx
  on public.uploads (owner_user_id, linked_entity_type, linked_entity_id);

create index profiles_role_deleted_idx
  on public.profiles (role, deleted_at);

create index addresses_owner_type_idx
  on public.addresses (owner_user_id, address_type, is_default);

create index traveler_profiles_owner_deleted_idx
  on public.traveler_profiles (owner_user_id, deleted_at);

create index saved_passenger_documents_owner_traveler_idx
  on public.saved_passenger_documents (owner_user_id, traveler_profile_id, deleted_at);

create index notifications_user_status_idx
  on public.notifications (user_id, status, created_at desc);

create index flight_offer_cache_search_idx
  on public.flight_offer_cache (search_hash, expires_at desc);

create index flight_offer_cache_route_idx
  on public.flight_offer_cache (
    origin_airport_code,
    destination_airport_code,
    departure_date,
    return_date
  );

create index hotel_offer_cache_search_idx
  on public.hotel_offer_cache (search_hash, city_id, check_in_date, check_out_date);

create index car_offer_cache_search_idx
  on public.car_offer_cache (search_hash, pickup_at, return_at);

create index transfer_offer_cache_search_idx
  on public.transfer_offer_cache (search_hash, pickup_at, transfer_type);

create index tour_offer_cache_search_idx
  on public.tour_offer_cache (search_hash, destination_id, service_date);

create index bookings_customer_status_idx
  on public.bookings (customer_user_id, status, created_at desc);

create index bookings_payment_status_idx
  on public.bookings (payment_status, created_at desc);

create index booking_items_booking_type_idx
  on public.booking_items (booking_id, booking_type, status);

create index booking_items_service_window_idx
  on public.booking_items (service_start_at, service_end_at);

create index booking_travelers_booking_idx
  on public.booking_travelers (booking_id, booking_item_id);

create index flight_bookings_route_idx
  on public.flight_bookings (origin_airport_code, destination_airport_code, departure_date);

create index flight_segment_snapshots_departure_idx
  on public.flight_segment_snapshots (flight_booking_id, departure_at);

create index hotel_bookings_stay_idx
  on public.hotel_bookings (property_city_id, check_in_date, check_out_date);

create index hotel_room_snapshots_booking_idx
  on public.hotel_room_snapshots (hotel_booking_id, room_index);

create index car_rental_bookings_pickup_idx
  on public.car_rental_bookings (pickup_at, return_at);

create index airport_transfer_bookings_pickup_idx
  on public.airport_transfer_bookings (pickup_at, transfer_type);

create index tour_bookings_service_idx
  on public.tour_bookings (destination_id, service_date);

create index visa_applications_applicant_status_idx
  on public.visa_applications (applicant_user_id, status, created_at desc);

create index search_logs_user_type_idx
  on public.search_logs (user_id, booking_type, created_at desc);

create index search_logs_session_idx
  on public.search_logs (session_id, created_at desc);

create index checkout_sessions_booking_user_idx
  on public.checkout_sessions (booking_id, user_id, status);

create index checkout_sessions_expires_idx
  on public.checkout_sessions (expires_at);

create index payments_booking_user_idx
  on public.payments (booking_id, user_id, status);

create index refunds_payment_booking_idx
  on public.refunds (payment_id, booking_id, status);

create index invoices_booking_user_idx
  on public.invoices (booking_id, user_id, status);

create index invoice_line_items_invoice_idx
  on public.invoice_line_items (invoice_id, line_index);

create index tax_line_items_invoice_idx
  on public.tax_line_items (invoice_id, booking_item_id);

create index coupons_active_window_idx
  on public.coupons (is_active, starts_at, ends_at);

create index applied_discounts_booking_idx
  on public.applied_discounts (booking_id, booking_item_id);

create index cookie_consent_user_session_idx
  on public.cookie_consent_records (user_id, session_id, consent_type, created_at desc);

create index privacy_consent_user_session_idx
  on public.privacy_consent_records (user_id, session_id, consent_type, created_at desc);

create index data_requests_user_status_idx
  on public.data_requests (user_id, status, created_at desc);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create index audit_logs_actor_idx
  on public.audit_logs (actor_user_id, created_at desc);

create index admin_notes_entity_idx
  on public.admin_notes (entity_type, entity_id, created_at desc);

create index support_tickets_owner_status_idx
  on public.support_tickets (owner_user_id, status, created_at desc);

create index support_tickets_booking_idx
  on public.support_tickets (booking_id);

comment on table public.supplier_credentials is
  'Sensitive supplier secrets and configuration. Intended for service-role or trusted admin workflows only.';

comment on table public.supplier_webhook_events is
  'Server-ingested supplier webhook payloads. End-user policies are intentionally omitted.';

comment on table public.idempotency_keys is
  'Server-side idempotency ledger for payment and webhook-sensitive operations.';

comment on table public.audit_logs is
  'Append-only audit trail for compliance and privileged actions. Writes should come from trusted server code.';

comment on table public.bookings is
  'Umbrella booking record. Child booking_items and subtype tables preserve immutable service snapshots.';

