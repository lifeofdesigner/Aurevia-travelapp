# Aurevia Travel

Premium full-stack travel booking platform for a Vienna, Austria based travel business serving global customers.

## Current Platform Status

The repository now includes:

- Next.js 14 App Router
- TypeScript strict mode
- Tailwind CSS with shadcn/ui-style primitives
- `next-intl` locale-aware routing for English and German
- Supabase Auth, Postgres schema, RLS-friendly ownership patterns, and private Storage flows
- Stripe Checkout, webhook processing, invoice generation, and transactional email abstractions
- Customer dashboard, admin panel, privacy tooling, and modular booking flows
- Mock-provider implementations for flights, stays, cars, transfers, tours, and visa-service workflows

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create local environment values:

```bash
cp env.example .env.local
```

3. Fill in the environment values required for your environment.

Key environment notes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the preferred public browser key.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a legacy fallback.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the client.
- `NEXT_PUBLIC_APP_URL` must match the URL you are serving locally or in deployment.
- `AUREVIA_COMPANY_*` values are placeholders and must be replaced before production invoicing.

4. Apply database migrations in order:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604250001_initial_schema.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604250002_rls_policies.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604260001_payment_webhook_events.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604260002_payment_webhook_events_rls.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604270001_visa_products.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604270002_visa_products_rls.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604270003_cookie_consent_categories.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202604270004_production_hardening.sql
```

5. Seed the core catalog data:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/001_core_seed.sql
```

6. Start the development server:

```bash
npm run dev
```

7. Validate locally:

```bash
npm run typecheck
npm run lint
npm run build
```

8. Visit:

```text
http://localhost:3000/en
http://localhost:3000/de
http://localhost:3000/api/health
```

## Project Shape

- `app/[locale]` contains localized App Router layouts, public pages, booking flows, dashboard pages, and admin pages.
- `app/api` contains server-only route handlers.
- `components/ui` contains shadcn-compatible primitives.
- `components/shared` contains layout shells, providers, and cross-app UI.
- `components/forms` contains reusable form support UI.
- `features/*` contains modular boundaries for flights, hotels, cars, tours, transfers, visa, account, admin, and payments.
- `lib` contains shared client-safe utilities for env parsing, i18n, money, VAT, permissions, dates, and routing.
- `server` contains server-only domain services, providers, payments, privacy, observability, and privileged Supabase access.
- `supabase` contains migrations, seeds, and architecture notes.
- `messages` contains English and German translation catalogs.
- `emails` contains transactional email templates.
- `docs` contains rollout and staging guidance.

## Architecture Notes

- Locale routing is handled through `next-intl` middleware and `app/[locale]`, with Supabase session refresh and security headers applied in middleware.
- Server Components are the default; client components are used only where interactivity is needed.
- Money is modeled as integer minor units plus ISO currency code.
- Booking records preserve immutable snapshots through `bookings`, `booking_items`, and service-specific child tables.
- Stripe payment capture, invoice issuance, and refund-state synchronization are hardened around idempotent provider references and webhook event persistence.
- Legal pages, cookie consent, privacy preferences, and data request workflows provide engineering support for GDPR-oriented operations.
- Mock suppliers keep the provider layer swappable until real supplier integrations are approved.

## Supabase Setup

- Enable Auth email flows or your chosen sign-in method in Supabase Auth.
- Keep RLS enabled on user-owned tables.
- Do not expose the service role key to browsers or client bundles.
- Confirm the private Storage buckets used by the app:
  - `invoice-pdfs`
  - `visa-documents`

## Stripe Setup

- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- For local webhook testing:

```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhooks/stripe
```

- Confirm these webhook events are subscribed in Stripe:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `charge.refunded`

## Observability and Security

- Structured server logs are emitted from `server/observability/logger.ts`.
- Sensitive invoice and visa document access routes use signed private URLs and no-store headers.
- Middleware applies security headers and refreshes Supabase sessions for page requests.
- Finance-sensitive actions write audit logs through the payment and admin service layers.

## Deployment

- Vercel + Supabase + Stripe rollout notes live in [docs/deployment-notes.md](docs/deployment-notes.md).
- Staging QA coverage lives in [docs/staging-checklist.md](docs/staging-checklist.md).

## Compliance Note

This codebase includes engineering mechanisms that support GDPR-aware and Austrian VAT-aware work, including cookie consent UI, privacy preferences, legal document versioning, private document handling, money utilities, invoice generation, and VAT helpers. Legal copy, supplier terms, tax treatment, refund rules, and privacy language still require review by qualified legal and tax professionals before production launch.

## Known Follow-up Areas

- Real supplier integrations are still pending for flights, stays, cars, transfers, tours, and visa-service operations.
- VAT handling is an engineering baseline and still needs accountant validation before go-live.
- Support operations and privacy workflows are production-oriented, but deletion/anonymization execution remains intentionally review-first.
