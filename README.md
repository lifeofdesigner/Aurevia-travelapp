# Aurevia Travel

Premium full-stack travel booking platform for a Vienna, Austria based travel business serving global customers.

## Stack

- Next.js 14 App Router
- TypeScript strict mode
- Tailwind CSS and shadcn/ui conventions
- next-intl for locale-aware routing and translations
- Supabase Auth, Postgres, and Storage helper structure
- TanStack Query for server state workflows
- Zustand for ephemeral client state
- Zod and React Hook Form for validation and forms
- Stripe SDK placeholder utilities
- Resend-backed email provider abstraction

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create local environment values:

```bash
cp env.example .env.local
```

3. Fill in Supabase, Stripe, and email values as they become available. The app can boot without supplier/payment/email credentials, but server helpers will throw clear configuration errors when a missing credential is required.

4. Start the development server:

```bash
npm run dev
```

5. Visit:

```text
http://localhost:3000/en
http://localhost:3000/de
```

## Project Shape

- `app/[locale]` contains localized App Router pages and layouts.
- `app/api` contains server-only API routes.
- `components/ui` contains shadcn-compatible primitives.
- `components/shared` contains shared layout and provider components.
- `features/*` is reserved for domain feature modules.
- `lib` contains shared client-safe utilities and infrastructure.
- `server` contains server-only integrations and privileged helpers.
- `supabase` contains migrations and seed assets.
- `messages` contains locale messages.

## Compliance Note

This bootstrap includes engineering mechanisms that support GDPR-aware and Austrian VAT-aware work, including cookie consent UI, locale-aware legal pages, money utilities, and VAT calculation helpers. Legal copy, tax treatment, refund rules, and privacy language still require review by qualified legal and tax professionals before production launch.
