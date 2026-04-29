alter table public.supported_currencies enable row level security;
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.airports enable row level security;
alter table public.airlines enable row level security;
alter table public.destinations enable row level security;
alter table public.featured_content enable row level security;
alter table public.legal_documents enable row level security;
alter table public.site_settings enable row level security;
alter table public.currency_rates enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_credentials enable row level security;
alter table public.supplier_webhook_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.uploads enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.addresses enable row level security;
alter table public.traveler_profiles enable row level security;
alter table public.saved_passenger_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.flight_offer_cache enable row level security;
alter table public.hotel_offer_cache enable row level security;
alter table public.car_offer_cache enable row level security;
alter table public.transfer_offer_cache enable row level security;
alter table public.tour_offer_cache enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_travelers enable row level security;
alter table public.flight_bookings enable row level security;
alter table public.flight_segment_snapshots enable row level security;
alter table public.hotel_bookings enable row level security;
alter table public.hotel_room_snapshots enable row level security;
alter table public.car_rental_bookings enable row level security;
alter table public.airport_transfer_bookings enable row level security;
alter table public.tour_bookings enable row level security;
alter table public.visa_applications enable row level security;
alter table public.search_logs enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.tax_line_items enable row level security;
alter table public.coupons enable row level security;
alter table public.applied_discounts enable row level security;
alter table public.cookie_consent_records enable row level security;
alter table public.privacy_consent_records enable row level security;
alter table public.data_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_notes enable row level security;
alter table public.support_tickets enable row level security;

create policy "supported_currencies_public_read"
on public.supported_currencies
for select
to anon, authenticated
using (is_active);

create policy "countries_public_read"
on public.countries
for select
to anon, authenticated
using (is_active);

create policy "cities_public_read"
on public.cities
for select
to anon, authenticated
using (true);

create policy "airports_public_read"
on public.airports
for select
to anon, authenticated
using (is_active);

create policy "airlines_public_read"
on public.airlines
for select
to anon, authenticated
using (is_active);

create policy "destinations_public_read"
on public.destinations
for select
to anon, authenticated
using (true);

create policy "featured_content_public_read"
on public.featured_content
for select
to anon, authenticated
using (
  is_published
  and (publish_starts_at is null or publish_starts_at <= timezone('utc', now()))
  and (publish_ends_at is null or publish_ends_at >= timezone('utc', now()))
);

create policy "featured_content_admin_manage"
on public.featured_content
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "legal_documents_public_read"
on public.legal_documents
for select
to anon, authenticated
using (
  publication_status = 'published'
  and effective_at <= timezone('utc', now())
);

create policy "legal_documents_admin_manage"
on public.legal_documents
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "site_settings_public_read"
on public.site_settings
for select
to anon, authenticated
using (is_public);

create policy "site_settings_admin_manage"
on public.site_settings
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "currency_rates_public_read"
on public.currency_rates
for select
to anon, authenticated
using (true);

create policy "currency_rates_admin_manage"
on public.currency_rates
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "suppliers_public_read"
on public.suppliers
for select
to anon, authenticated
using (is_active);

create policy "suppliers_admin_manage"
on public.suppliers
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "profiles_self_read"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_self_insert"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_staff_read"
on public.profiles
for select
to authenticated
using (public.is_staff());

create policy "profiles_admin_manage"
on public.profiles
for update
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "user_preferences_self_read"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_preferences_self_insert"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_preferences_self_update"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "addresses_owner_read"
on public.addresses
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_staff());

create policy "addresses_owner_insert"
on public.addresses
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "addresses_owner_update"
on public.addresses
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "traveler_profiles_owner_read"
on public.traveler_profiles
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_staff());

create policy "traveler_profiles_owner_insert"
on public.traveler_profiles
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "traveler_profiles_owner_update"
on public.traveler_profiles
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "saved_passenger_documents_owner_read"
on public.saved_passenger_documents
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_staff());

create policy "saved_passenger_documents_owner_insert"
on public.saved_passenger_documents
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "saved_passenger_documents_owner_update"
on public.saved_passenger_documents
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "notifications_owner_read"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "notifications_owner_update"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "uploads_owner_or_public_read"
on public.uploads
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_staff() or not is_private);

create policy "uploads_public_read"
on public.uploads
for select
to anon
using (not is_private);

create policy "uploads_owner_insert"
on public.uploads
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "uploads_owner_update"
on public.uploads
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "search_logs_owner_read"
on public.search_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "search_logs_authenticated_insert"
on public.search_logs
for insert
to authenticated
with check (user_id = auth.uid());

create policy "search_logs_anon_insert"
on public.search_logs
for insert
to anon
with check (user_id is null);

create policy "bookings_owner_read"
on public.bookings
for select
to authenticated
using (customer_user_id = auth.uid() or public.is_staff());

create policy "booking_items_owner_read"
on public.booking_items
for select
to authenticated
using (public.is_booking_owner(booking_id) or public.is_staff());

create policy "booking_travelers_owner_read"
on public.booking_travelers
for select
to authenticated
using (public.is_booking_owner(booking_id) or public.is_staff());

create policy "flight_bookings_owner_read"
on public.flight_bookings
for select
to authenticated
using (public.is_booking_item_owner(booking_item_id) or public.is_staff());

create policy "flight_segment_snapshots_owner_read"
on public.flight_segment_snapshots
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.flight_bookings as fb
    where fb.id = flight_booking_id
      and public.is_booking_item_owner(fb.booking_item_id)
  )
);

create policy "hotel_bookings_owner_read"
on public.hotel_bookings
for select
to authenticated
using (public.is_booking_item_owner(booking_item_id) or public.is_staff());

create policy "hotel_room_snapshots_owner_read"
on public.hotel_room_snapshots
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.hotel_bookings as hb
    where hb.id = hotel_booking_id
      and public.is_booking_item_owner(hb.booking_item_id)
  )
);

create policy "car_rental_bookings_owner_read"
on public.car_rental_bookings
for select
to authenticated
using (public.is_booking_item_owner(booking_item_id) or public.is_staff());

create policy "airport_transfer_bookings_owner_read"
on public.airport_transfer_bookings
for select
to authenticated
using (public.is_booking_item_owner(booking_item_id) or public.is_staff());

create policy "tour_bookings_owner_read"
on public.tour_bookings
for select
to authenticated
using (public.is_booking_item_owner(booking_item_id) or public.is_staff());

create policy "visa_applications_owner_read"
on public.visa_applications
for select
to authenticated
using (applicant_user_id = auth.uid() or public.is_staff());

create policy "checkout_sessions_owner_read"
on public.checkout_sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "payments_owner_read"
on public.payments
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "refunds_owner_read"
on public.refunds
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "invoices_owner_read"
on public.invoices
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "invoice_line_items_owner_read"
on public.invoice_line_items
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.invoices as i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "tax_line_items_owner_read"
on public.tax_line_items
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.invoices as i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.booking_items as bi
    where bi.id = booking_item_id
      and public.is_booking_owner(bi.booking_id)
  )
);

create policy "coupons_admin_manage"
on public.coupons
for all
to authenticated
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create policy "applied_discounts_owner_read"
on public.applied_discounts
for select
to authenticated
using (
  public.is_staff()
  or public.is_booking_owner(booking_id)
);

create policy "cookie_consent_self_read"
on public.cookie_consent_records
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "cookie_consent_authenticated_insert"
on public.cookie_consent_records
for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);

create policy "cookie_consent_anon_insert"
on public.cookie_consent_records
for insert
to anon
with check (user_id is null);

create policy "privacy_consent_self_read"
on public.privacy_consent_records
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "privacy_consent_authenticated_insert"
on public.privacy_consent_records
for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);

create policy "privacy_consent_anon_insert"
on public.privacy_consent_records
for insert
to anon
with check (user_id is null);

create policy "data_requests_owner_read"
on public.data_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "data_requests_authenticated_insert"
on public.data_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "data_requests_anon_insert"
on public.data_requests
for insert
to anon
with check (user_id is null);

create policy "audit_logs_admin_read"
on public.audit_logs
for select
to authenticated
using (public.current_user_role() in ('admin', 'owner'));

create policy "admin_notes_staff_read"
on public.admin_notes
for select
to authenticated
using (public.is_staff());

create policy "admin_notes_staff_insert"
on public.admin_notes
for insert
to authenticated
with check (public.is_staff() and author_user_id = auth.uid());

create policy "admin_notes_staff_update"
on public.admin_notes
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "support_tickets_owner_read"
on public.support_tickets
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_staff());

create policy "support_tickets_owner_insert"
on public.support_tickets
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "support_tickets_staff_update"
on public.support_tickets
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

