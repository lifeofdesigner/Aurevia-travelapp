# Aurevia Travel Staging Checklist

Use this checklist before every staging sign-off and again before production launch.

## Auth and Access

- Sign up, sign in, sign out, and refresh the session in both `en` and `de`.
- Visit `/en/dashboard` and `/de/dashboard` while signed out and confirm redirect to localized auth.
- Visit `/en/admin` while signed in as a customer and confirm redirect away from admin.
- Visit `/en/admin` while signed in as `support`, `admin`, and `owner` users and confirm role-based access.

## Locale and Currency

- Switch between English and German from the header and footer.
- Confirm public routes render localized copy under `/en/*` and `/de/*`.
- Change the currency shell and confirm the preference persists where supported.

## Booking Flows

- Flights: search, review results, open an offer, complete traveler/contact details, create a pending booking.
- Hotels: search, filter, open property detail, select room, create a pending booking.
- Cars: search, filter, open vehicle detail, create a pending booking.
- Transfers: test airport-to-hotel, hotel-to-airport, and point-to-point, then create a pending booking.
- Tours: search, filter, open detail page, choose slot and participants, create a pending booking.

## Visa Uploads

- Start or open a draft visa application.
- Upload an allowed PDF or image under the size limit and confirm metadata is created.
- Attempt an unsupported file type and confirm validation messaging appears.
- Open the uploaded document through the signed access route and confirm the raw private storage path is never exposed.

## Payments and Invoices

- Create a pending hotel, car, transfer, tour, and flight booking, then open checkout.
- Confirm tax, subtotal, and total are shown in stored booking currency.
- Run a Stripe test payment with webhook forwarding enabled.
- Confirm checkout session, payment, booking, invoice, invoice PDF metadata, and audit logs are updated exactly once.
- Replay the same webhook and confirm duplicate safety.
- Open the invoice download link while signed in as the booking owner and confirm signed private access works.
- Attempt invoice access as another user and confirm it is blocked.

## Dashboard

- Review overview, bookings, booking detail, profile/settings, traveler profiles, payments, and visa application pages.
- Confirm only the signed-in user’s data is visible.
- Create, edit, and delete saved travelers.
- Update locale/currency/profile preferences and confirm persistence.

## Admin

- Review analytics cards and charts on the admin dashboard.
- Filter bookings, customers, visa review items, support tickets, and privacy requests.
- Create and edit operational data for destinations, airports, airlines, featured content, legal documents, visa products, suppliers, coupons, and site settings.
- Confirm sensitive admin mutations generate audit log rows.

## Privacy and Legal

- Confirm cookie banner appears on first visit, supports accept/reject/customize, and persists choices.
- Update privacy preferences from the dashboard privacy center.
- Submit both a data export request and a data deletion request.
- Review those requests from the admin privacy queue and update status/assignee safely.
- Visit localized legal pages for privacy, terms, cookies, and refunds.

## Accessibility and Responsive QA

- Tab through header, search tabs, cookie controls, dashboard navigation, admin navigation, and checkout actions.
- Confirm focus indicators are visible on links, buttons, inputs, and locale switches.
- Test mobile layouts for homepage, search flows, dashboard, admin, and checkout.
- Confirm loading, empty, and error states are understandable without relying on color alone.
