# Supabase Ownership And RLS Strategy

## Ownership model

- Root user-owned tables store a direct ownership column:
  `profiles.user_id`, `user_preferences.user_id`, `addresses.owner_user_id`,
  `traveler_profiles.owner_user_id`, `saved_passenger_documents.owner_user_id`,
  `notifications.user_id`, `uploads.owner_user_id`, `support_tickets.owner_user_id`,
  `visa_applications.applicant_user_id`, `bookings.customer_user_id`,
  `checkout_sessions.user_id`, `payments.user_id`, `refunds.user_id`, `invoices.user_id`.
- Booking children inherit ownership through the booking graph:
  `booking_items -> bookings`, subtype booking tables -> `booking_items`, and
  snapshot tables -> subtype booking records.
- Consent and privacy request tables allow both authenticated ownership and
  anonymous/session-linked creation so GDPR flows can start before sign-in.

## RLS design

- Public catalog and legal tables use read policies for `anon` and `authenticated`.
- User-facing private tables use direct owner checks or booking helper functions:
  `public.is_booking_owner(...)` and `public.is_booking_item_owner(...)`.
- Staff visibility is granted through `public.is_staff()` and
  `public.current_user_role()`, both implemented as `security definer`
  functions so policies can safely reference application roles stored in
  `public.profiles`.

## Server-only tables and flows

- `supplier_credentials`, `supplier_webhook_events`, `idempotency_keys`, and
  `audit_logs` intentionally do not grant end-user write access.
- Offer cache tables (`flight_offer_cache`, `hotel_offer_cache`, `car_offer_cache`,
  `transfer_offer_cache`, `tour_offer_cache`) are server-managed caches and are
  intentionally not exposed through public RLS read policies in this phase.
- Financial writes for `bookings`, `checkout_sessions`, `payments`, `refunds`,
  `invoices`, and discount application should go through trusted server code,
  even though end users may read their own records through RLS.
- Admin and compliance workflows should use protected server actions or service
  role code when mutating privileged records.

## Snapshot integrity

- `bookings` is the umbrella record.
- `booking_items` is the extensible per-service layer for future multi-service
  itineraries.
- Service-specific tables (`flight_bookings`, `hotel_bookings`, `tour_bookings`,
  `car_rental_bookings`, `airport_transfer_bookings`, `visa_applications`) keep
  booking-time snapshots rather than referencing mutable supplier offers.
- Immutable child snapshot tables such as `flight_segment_snapshots` and
  `hotel_room_snapshots` preserve historical details after supplier inventory
  changes.
