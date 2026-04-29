import "server-only";

import {getPublicEnv, type PublicEnv} from "@/lib/env/client";

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function ensureMinLength(value: string, minimum: number, key: string) {
  if (value.length < minimum) {
    throw new Error(`Invalid server environment configuration: ${key} must be at least ${minimum} characters.`);
  }

  return value;
}

function ensureEmail(value: string, key: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`Invalid server environment configuration: ${key} must be a valid email address.`);
  }

  return value;
}

export type ServerEnv = PublicEnv & {
  AUREVIA_COMPANY_ADDRESS: string;
  AUREVIA_COMPANY_EMAIL: string;
  AUREVIA_COMPANY_NAME: string;
  AUREVIA_COMPANY_VAT_ID: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_INVOICES_BUCKET: string;
  SUPABASE_LIVE_CHAT_ATTACHMENTS_BUCKET: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_VISA_DOCUMENTS_BUCKET: string;
};

export type ServerEnvKey = keyof ServerEnv;

export function getServerEnv(): ServerEnv {
  return {
    ...getPublicEnv(),
    AUREVIA_COMPANY_ADDRESS: ensureMinLength(
      normalizeOptionalString(process.env.AUREVIA_COMPANY_ADDRESS) ?? "Vienna, Austria",
      8,
      "AUREVIA_COMPANY_ADDRESS"
    ),
    AUREVIA_COMPANY_EMAIL: ensureEmail(
      normalizeOptionalString(process.env.AUREVIA_COMPANY_EMAIL) ?? "billing@aurevia.example",
      "AUREVIA_COMPANY_EMAIL"
    ),
    AUREVIA_COMPANY_NAME: ensureMinLength(
      normalizeOptionalString(process.env.AUREVIA_COMPANY_NAME) ?? "Aurevia Travel",
      2,
      "AUREVIA_COMPANY_NAME"
    ),
    AUREVIA_COMPANY_VAT_ID: ensureMinLength(
      normalizeOptionalString(process.env.AUREVIA_COMPANY_VAT_ID) ?? "ATU-REVIEW-REQUIRED",
      3,
      "AUREVIA_COMPANY_VAT_ID"
    ),
    EMAIL_FROM: ensureMinLength(
      normalizeOptionalString(process.env.EMAIL_FROM) ?? "Aurevia Travel <bookings@aurevia.example>",
      3,
      "EMAIL_FROM"
    ),
    EMAIL_FROM_NAME: normalizeOptionalString(process.env.EMAIL_FROM_NAME),
    PAYSTACK_PUBLIC_KEY: normalizeOptionalString(process.env.PAYSTACK_PUBLIC_KEY),
    PAYSTACK_SECRET_KEY: normalizeOptionalString(process.env.PAYSTACK_SECRET_KEY),
    RESEND_API_KEY: normalizeOptionalString(process.env.RESEND_API_KEY),
    STRIPE_SECRET_KEY: normalizeOptionalString(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: normalizeOptionalString(process.env.STRIPE_WEBHOOK_SECRET),
    SUPABASE_INVOICES_BUCKET: ensureMinLength(
      normalizeOptionalString(process.env.SUPABASE_INVOICES_BUCKET) ?? "invoice-pdfs",
      3,
      "SUPABASE_INVOICES_BUCKET"
    ),
    SUPABASE_LIVE_CHAT_ATTACHMENTS_BUCKET: ensureMinLength(
      normalizeOptionalString(process.env.SUPABASE_LIVE_CHAT_ATTACHMENTS_BUCKET) ?? "live-chat-attachments",
      3,
      "SUPABASE_LIVE_CHAT_ATTACHMENTS_BUCKET"
    ),
    SUPABASE_SERVICE_ROLE_KEY: normalizeOptionalString(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_VISA_DOCUMENTS_BUCKET: ensureMinLength(
      normalizeOptionalString(process.env.SUPABASE_VISA_DOCUMENTS_BUCKET) ?? "visa-documents",
      3,
      "SUPABASE_VISA_DOCUMENTS_BUCKET"
    )
  };
}

export function requireServerEnv<K extends ServerEnvKey>(
  key: K
): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];

  if (!value) {
    throw new Error(`${key} must be configured for this server operation.`);
  }

  return value as NonNullable<ServerEnv[K]>;
}
