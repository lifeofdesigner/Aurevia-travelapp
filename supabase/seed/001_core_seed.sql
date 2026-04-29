insert into public.supported_currencies (
  code,
  display_name,
  symbol,
  decimal_places,
  sort_order
)
values
  ('EUR', 'Euro', 'EUR', 2, 1),
  ('USD', 'US Dollar', 'USD', 2, 2),
  ('GBP', 'British Pound', 'GBP', 2, 3),
  ('AED', 'UAE Dirham', 'AED', 2, 4),
  ('NGN', 'Nigerian Naira', 'NGN', 2, 5)
on conflict (code) do update
set
  display_name = excluded.display_name,
  symbol = excluded.symbol,
  decimal_places = excluded.decimal_places,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.countries (
  code,
  iso3,
  name,
  localized_names,
  currency_code,
  phone_code,
  is_schengen
)
values
  ('AT', 'AUT', 'Austria', '{"de":"Oesterreich"}'::jsonb, 'EUR', '+43', true),
  ('AE', 'ARE', 'United Arab Emirates', '{"de":"Vereinigte Arabische Emirate"}'::jsonb, 'AED', '+971', false),
  ('GB', 'GBR', 'United Kingdom', '{"de":"Vereinigtes Koenigreich"}'::jsonb, 'GBP', '+44', false),
  ('NG', 'NGA', 'Nigeria', '{"de":"Nigeria"}'::jsonb, 'NGN', '+234', false),
  ('US', 'USA', 'United States', '{"de":"Vereinigte Staaten"}'::jsonb, 'USD', '+1', false)
on conflict (code) do update
set
  iso3 = excluded.iso3,
  name = excluded.name,
  localized_names = excluded.localized_names,
  currency_code = excluded.currency_code,
  phone_code = excluded.phone_code,
  is_schengen = excluded.is_schengen,
  is_active = true;

insert into public.cities (
  id,
  country_code,
  slug,
  name,
  localized_names,
  time_zone,
  latitude,
  longitude,
  is_featured
)
values
  ('11111111-1111-1111-1111-111111111111', 'AT', 'vienna', 'Vienna', '{"de":"Wien"}'::jsonb, 'Europe/Vienna', 48.208200, 16.373800, true),
  ('22222222-2222-2222-2222-222222222222', 'AE', 'dubai', 'Dubai', '{"de":"Dubai"}'::jsonb, 'Asia/Dubai', 25.204800, 55.270800, true),
  ('33333333-3333-3333-3333-333333333333', 'GB', 'london', 'London', '{"de":"London"}'::jsonb, 'Europe/London', 51.507200, -0.127600, true),
  ('44444444-4444-4444-4444-444444444444', 'NG', 'lagos', 'Lagos', '{"de":"Lagos"}'::jsonb, 'Africa/Lagos', 6.524400, 3.379200, true),
  ('55555555-5555-5555-5555-555555555555', 'US', 'new-york', 'New York', '{"de":"New York"}'::jsonb, 'America/New_York', 40.712800, -74.006000, true)
on conflict (slug) do update
set
  country_code = excluded.country_code,
  name = excluded.name,
  localized_names = excluded.localized_names,
  time_zone = excluded.time_zone,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_featured = excluded.is_featured;

insert into public.airports (
  id,
  city_id,
  country_code,
  iata_code,
  icao_code,
  name,
  time_zone,
  latitude,
  longitude
)
values
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'AT', 'VIE', 'LOWW', 'Vienna International Airport', 'Europe/Vienna', 48.110300, 16.569700),
  ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'AE', 'DXB', 'OMDB', 'Dubai International Airport', 'Asia/Dubai', 25.253200, 55.365700),
  ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'GB', 'LHR', 'EGLL', 'Heathrow Airport', 'Europe/London', 51.470000, -0.454300),
  ('aaaa4444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'NG', 'LOS', 'DNMM', 'Murtala Muhammed International Airport', 'Africa/Lagos', 6.577400, 3.321200),
  ('aaaa5555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'US', 'JFK', 'KJFK', 'John F. Kennedy International Airport', 'America/New_York', 40.641300, -73.778100)
on conflict (iata_code) do update
set
  city_id = excluded.city_id,
  country_code = excluded.country_code,
  icao_code = excluded.icao_code,
  name = excluded.name,
  time_zone = excluded.time_zone,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_active = true;

insert into public.airlines (
  id,
  country_code,
  iata_code,
  icao_code,
  name
)
values
  ('bbbb1111-1111-1111-1111-111111111111', 'AT', 'OS', 'AUA', 'Austrian Airlines'),
  ('bbbb2222-2222-2222-2222-222222222222', 'AE', 'EK', 'UAE', 'Emirates'),
  ('bbbb3333-3333-3333-3333-333333333333', 'GB', 'BA', 'BAW', 'British Airways'),
  ('bbbb4444-4444-4444-4444-444444444444', 'NG', 'P4', 'APK', 'Air Peace'),
  ('bbbb5555-5555-5555-5555-555555555555', 'US', 'DL', 'DAL', 'Delta Air Lines')
on conflict (iata_code) do update
set
  country_code = excluded.country_code,
  icao_code = excluded.icao_code,
  name = excluded.name,
  is_active = true;

insert into public.destinations (
  id,
  slug,
  destination_type,
  country_code,
  city_id,
  airport_id,
  title,
  summary,
  hero_image_url,
  theme_color,
  tags,
  is_featured,
  sort_order
)
values
  (
    'cccc1111-1111-1111-1111-111111111111',
    'vienna-city-break',
    'city',
    'AT',
    '11111111-1111-1111-1111-111111111111',
    'aaaa1111-1111-1111-1111-111111111111',
    'Vienna',
    'Elegant city stays, premium rail and air access, and curated cultural experiences.',
    'https://images.unsplash.com/photo-1516557070061-c3d1653fa646?auto=format&fit=crop&w=1200&q=80',
    '#0F766E',
    array['culture', 'city-break', 'luxury'],
    true,
    1
  ),
  (
    'cccc2222-2222-2222-2222-222222222222',
    'dubai-luxury-stopover',
    'city',
    'AE',
    '22222222-2222-2222-2222-222222222222',
    'aaaa2222-2222-2222-2222-222222222222',
    'Dubai',
    'High-end stopovers, premium transfers, and desert or marina experiences.',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
    '#C28A2F',
    array['luxury', 'stopover', 'shopping'],
    true,
    2
  ),
  (
    'cccc3333-3333-3333-3333-333333333333',
    'london-signature-stays',
    'city',
    'GB',
    '33333333-3333-3333-3333-333333333333',
    'aaaa3333-3333-3333-3333-333333333333',
    'London',
    'Premium stays and activity-led itineraries for business and leisure travelers.',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
    '#1D4ED8',
    array['city-break', 'business', 'family'],
    true,
    3
  )
on conflict (slug) do update
set
  destination_type = excluded.destination_type,
  country_code = excluded.country_code,
  city_id = excluded.city_id,
  airport_id = excluded.airport_id,
  title = excluded.title,
  summary = excluded.summary,
  hero_image_url = excluded.hero_image_url,
  theme_color = excluded.theme_color,
  tags = excluded.tags,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

insert into public.featured_content (
  id,
  content_key,
  locale,
  destination_id,
  badge,
  title,
  summary,
  body_markdown,
  cta_label,
  cta_href,
  image_url,
  is_published,
  sort_order
)
values
  (
    'dddd1111-1111-1111-1111-111111111111',
    'home-vienna-signature',
    'en',
    'cccc1111-1111-1111-1111-111111111111',
    'Curated',
    'Vienna based, globally connected',
    'Aurevia Travel blends premium trip design with modular booking operations.',
    'Premium itineraries, supplier-ready booking modules, and GDPR-aware customer journeys.',
    'Explore Vienna',
    '/en',
    'https://images.unsplash.com/photo-1516557070061-c3d1653fa646?auto=format&fit=crop&w=1200&q=80',
    true,
    1
  ),
  (
    'dddd2222-2222-2222-2222-222222222222',
    'home-vienna-signature',
    'de',
    'cccc1111-1111-1111-1111-111111111111',
    'Kuratierte Reisen',
    'In Wien ansaessig, global vernetzt',
    'Aurevia Travel verbindet Premium-Reiseplanung mit modularen Buchungsablaeufen.',
    'Premium-Itineraries, anbieterfaehige Buchungsmodule und DSGVO-bewusste Kundenreisen.',
    'Wien entdecken',
    '/de',
    'https://images.unsplash.com/photo-1516557070061-c3d1653fa646?auto=format&fit=crop&w=1200&q=80',
    true,
    1
  )
on conflict (content_key, locale) do update
set
  destination_id = excluded.destination_id,
  badge = excluded.badge,
  title = excluded.title,
  summary = excluded.summary,
  body_markdown = excluded.body_markdown,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  image_url = excluded.image_url,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order;

insert into public.legal_documents (
  id,
  document_key,
  locale,
  version,
  title,
  summary,
  body_markdown,
  publication_status,
  effective_at,
  published_at,
  checksum_sha256,
  is_current
)
values
  (
    'eeee1111-1111-1111-1111-111111111111',
    'privacy_policy',
    'en',
    '2026.04',
    'Privacy Policy',
    'Engineering placeholder for GDPR-oriented privacy disclosures.',
    'This seeded document is a product placeholder and must be replaced with reviewed legal text before launch.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'privacy-en-2026-04',
    true
  ),
  (
    'eeee1112-1111-1111-1111-111111111111',
    'privacy_policy',
    'de',
    '2026.04',
    'Datenschutzerklaerung',
    'Technischer Platzhalter fuer DSGVO-orientierte Datenschutzhinweise.',
    'Dieses Seed-Dokument ist ein Produktplatzhalter und muss vor dem Launch durch gepruefte Rechtstexte ersetzt werden.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'privacy-de-2026-04',
    true
  ),
  (
    'eeee2221-1111-1111-1111-111111111111',
    'terms_of_use',
    'en',
    '2026.04',
    'Terms of Use',
    'Engineering placeholder for platform and booking terms.',
    'This seeded document is a product placeholder and must be replaced with reviewed legal text before launch.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'terms-en-2026-04',
    true
  ),
  (
    'eeee2222-1111-1111-1111-111111111111',
    'terms_of_use',
    'de',
    '2026.04',
    'Nutzungsbedingungen',
    'Technischer Platzhalter fuer Plattform- und Buchungsbedingungen.',
    'Dieses Seed-Dokument ist ein Produktplatzhalter und muss vor dem Launch durch gepruefte Rechtstexte ersetzt werden.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'terms-de-2026-04',
    true
  ),
  (
    'eeee3331-1111-1111-1111-111111111111',
    'cookie_policy',
    'en',
    '2026.04',
    'Cookie Policy',
    'Engineering placeholder for cookie controls and storage disclosures.',
    'This seeded document is a product placeholder and must be replaced with reviewed legal text before launch.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'cookies-en-2026-04',
    true
  ),
  (
    'eeee3332-1111-1111-1111-111111111111',
    'cookie_policy',
    'de',
    '2026.04',
    'Cookie-Richtlinie',
    'Technischer Platzhalter fuer Cookie-Kontrollen und Speicherhinweise.',
    'Dieses Seed-Dokument ist ein Produktplatzhalter und muss vor dem Launch durch gepruefte Rechtstexte ersetzt werden.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'cookies-de-2026-04',
    true
  ),
  (
    'eeee4441-1111-1111-1111-111111111111',
    'refund_policy',
    'en',
    '2026.04',
    'Refund Policy',
    'Engineering placeholder for supplier-led cancellation and refund rules.',
    'This seeded document is a product placeholder and must be replaced with reviewed legal text before launch.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'refunds-en-2026-04',
    true
  ),
  (
    'eeee4442-1111-1111-1111-111111111111',
    'refund_policy',
    'de',
    '2026.04',
    'Rueckerstattungsrichtlinie',
    'Technischer Platzhalter fuer anbieterbezogene Storno- und Erstattungsregeln.',
    'Dieses Seed-Dokument ist ein Produktplatzhalter und muss vor dem Launch durch gepruefte Rechtstexte ersetzt werden.',
    'published',
    '2026-04-01T00:00:00Z',
    '2026-04-01T00:00:00Z',
    'refunds-de-2026-04',
    true
  )
on conflict (document_key, locale, version) do update
set
  title = excluded.title,
  summary = excluded.summary,
  body_markdown = excluded.body_markdown,
  publication_status = excluded.publication_status,
  effective_at = excluded.effective_at,
  published_at = excluded.published_at,
  checksum_sha256 = excluded.checksum_sha256,
  is_current = excluded.is_current;

insert into public.site_settings (
  id,
  setting_key,
  locale,
  setting_value,
  is_public,
  description
)
values
  (
    'ffff1111-1111-1111-1111-111111111111',
    'business.profile',
    null,
    '{
      "name": "Aurevia Travel",
      "city": "Vienna",
      "country_code": "AT",
      "default_currency": "EUR",
      "supported_locales": ["en", "de"]
    }'::jsonb,
    true,
    'Public-facing business profile seed.'
  ),
  (
    'ffff2222-2222-2222-2222-222222222222',
    'commerce.settings',
    null,
    '{
      "default_currency": "EUR",
      "supported_currencies": ["EUR", "USD", "GBP", "AED", "NGN"],
      "austrian_vat_rate": 0.2
    }'::jsonb,
    true,
    'Commerce defaults for currency and VAT.'
  ),
  (
    'ffff3333-3333-3333-3333-333333333333',
    'support.contacts',
    null,
    '{
      "email": "support@aurevia.example",
      "sales_email": "bookings@aurevia.example",
      "locale_default": "en"
    }'::jsonb,
    true,
    'Public support contact details placeholder.'
  )
on conflict do nothing;

insert into public.currency_rates (
  id,
  base_currency,
  quote_currency,
  rate_value,
  rate_date,
  source
)
values
  ('abab1111-1111-1111-1111-111111111111', 'EUR', 'USD', 1.08000000, '2026-04-25', 'seed'),
  ('abab2222-2222-2222-2222-222222222222', 'EUR', 'GBP', 0.86000000, '2026-04-25', 'seed'),
  ('abab3333-3333-3333-3333-333333333333', 'EUR', 'AED', 3.97000000, '2026-04-25', 'seed'),
  ('abab4444-4444-4444-4444-444444444444', 'EUR', 'NGN', 1685.00000000, '2026-04-25', 'seed')
on conflict (base_currency, quote_currency, rate_date, source) do update
set
  rate_value = excluded.rate_value;

insert into public.suppliers (
  id,
  code,
  name,
  service_types,
  base_url,
  contact_email,
  configuration
)
values
  (
    '12121212-1212-1212-1212-121212121212',
    'mock-flights-core',
    'Mock Flights Core',
    array['flight']::public.booking_type[],
    'https://mock-suppliers.aurevia.local/flights',
    'flights@aurevia.example',
    '{"mode":"mock","supports_live_pricing":true}'::jsonb
  ),
  (
    '23232323-2323-2323-2323-232323232323',
    'mock-stays-suite',
    'Mock Stays Suite',
    array['hotel']::public.booking_type[],
    'https://mock-suppliers.aurevia.local/hotels',
    'stays@aurevia.example',
    '{"mode":"mock","supports_room_snapshots":true}'::jsonb
  ),
  (
    '34343434-3434-3434-3434-343434343434',
    'mock-mobility-hub',
    'Mock Mobility Hub',
    array['car_rental', 'airport_transfer']::public.booking_type[],
    'https://mock-suppliers.aurevia.local/mobility',
    'mobility@aurevia.example',
    '{"mode":"mock","supports_transfers":true,"supports_cars":true}'::jsonb
  ),
  (
    '45454545-4545-4545-4545-454545454545',
    'mock-tours-curated',
    'Mock Tours Curated',
    array['tour']::public.booking_type[],
    'https://mock-suppliers.aurevia.local/tours',
    'tours@aurevia.example',
    '{"mode":"mock","supports_ticket_delivery":true}'::jsonb
  ),
  (
    '56565656-5656-5656-5656-565656565656',
    'mock-visa-desk',
    'Mock Visa Desk',
    array['visa']::public.booking_type[],
    'https://mock-suppliers.aurevia.local/visa',
    'visa@aurevia.example',
    '{"mode":"mock","supports_document_checklists":true}'::jsonb
  )
on conflict (code) do update
set
  name = excluded.name,
  service_types = excluded.service_types,
  base_url = excluded.base_url,
  contact_email = excluded.contact_email,
  configuration = excluded.configuration,
  is_active = true;
