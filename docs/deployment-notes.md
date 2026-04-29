# Aurevia Travel Deployment Notes

## Target Stack

- Frontend/runtime: Vercel
- Database, Auth, Storage: Supabase
- Payments: Stripe Checkout + Stripe webhooks
- Transactional email: Resend

## Vercel

1. Create a Vercel project connected to this GitHub repository.
2. Set the framework preset to Next.js.
3. Add all values from `env.example` to the Vercel environment for Preview and Production.
4. Ensure `NEXT_PUBLIC_APP_URL` matches the public deployment URL for each environment.
5. Trigger a fresh build after every environment variable change.

## Supabase

1. Create a Supabase project and copy the project URL, publishable key, and service role key into environment variables.
2. Apply migrations in lexical order from `supabase/migrations`.
3. Run `supabase/seed/001_core_seed.sql`.
4. Confirm private buckets exist or let the app create them on first secure write:
   - `invoice-pdfs`
   - `visa-documents`
5. Confirm RLS remains enabled on user-owned tables.

## Stripe

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. For local testing, run:

```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhooks/stripe
```

3. In Stripe Dashboard, create a production webhook endpoint for:

```text
https://<your-domain>/api/payments/webhooks/stripe
```

4. Subscribe at minimum to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`

## Resend

1. Add `RESEND_API_KEY`.
2. Configure and verify the domain used by `EMAIL_FROM`.
3. Test booking confirmation and payment receipt delivery in preview and production.

## Launch Operations

- Verify the sitemap and robots output on the final domain.
- Confirm the middleware-based security headers are present in production responses.
- Confirm Stripe webhook delivery succeeds without retries on healthy payments.
- Confirm invoice PDF storage and signed delivery work in the production Supabase project.
- Review legal copy and Austrian VAT handling with qualified legal/tax advisors before public launch.

## Known Supplier Follow-up Areas

- Flights still use mock inventory and require live GDS/provider integration later.
- Hotels, cars, transfers, and tours still use mock providers and curated seed data.
- Visa workflows are service-assistance flows, not government filing integrations.
- Tax handling uses an engineering baseline and still requires accountant review for live launch.
