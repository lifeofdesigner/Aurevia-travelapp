import "server-only";

import {createHash} from "crypto";
import type Stripe from "stripe";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {finalizeSuccessfulStripeCheckoutSession} from "@/server/payments/webhook-service";
import {
  getPaymentProviderRuntimeConfig,
  isPaymentMethodEnabled
} from "@/server/payments/payment-methods";

import {createFinanceAuditLog} from "./audit";
import {
  getOwnedBookingPaymentSummary,
  getOwnedPaymentReceiptSummary
} from "./booking-summary";
import {type CheckoutSessionLaunch, type PaymentBookingSummary} from "./types";
import {normalizeStripeCurrency} from "./tax";
import {createIdempotencyKey, getConfiguredStripeClient} from "./stripe";

type StoredCheckoutResponse = {
  checkoutSessionId?: string;
  checkoutUrl?: string;
  expiresAt?: string | null;
};

function buildRequestHash(bookingId: string, locale: Locale) {
  return createHash("sha256")
    .update(JSON.stringify({bookingId, locale}))
    .digest("hex");
}

function extractStoredCheckoutResponse(value: unknown): CheckoutSessionLaunch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const response = value as StoredCheckoutResponse;

  if (
    typeof response.checkoutSessionId !== "string" ||
    typeof response.checkoutUrl !== "string"
  ) {
    return null;
  }

  return {
    checkoutSessionId: response.checkoutSessionId,
    checkoutUrl: response.checkoutUrl,
    expiresAt: response.expiresAt ?? null
  };
}

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
}

async function hasStripeSecret() {
  const config = await getPaymentProviderRuntimeConfig("stripe");
  return Boolean(config.secrets.secretKey);
}

function isDevelopmentCheckoutEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_CHECKOUT === "true"
  );
}

async function canUseDevelopmentCheckoutFallback() {
  return isDevelopmentCheckoutEnabled() && !(await hasStripeSecret());
}

function buildDevelopmentSessionId(idempotencyKey: string) {
  return `dev_stripe_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`;
}

async function createDevelopmentCheckoutSession({
  idempotencyKey,
  locale,
  requestHash,
  requestScope,
  summary,
  userId
}: {
  idempotencyKey: string;
  locale: Locale;
  requestHash: string;
  requestScope: string;
  summary: PaymentBookingSummary;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  const admin = createSupabaseAdminClient();
  const providerSessionId = buildDevelopmentSessionId(idempotencyKey);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const successUrl = buildAppUrl(
    `/${locale}/payments/success?session_id=${encodeURIComponent(providerSessionId)}`
  );
  const confirmUrl = buildAppUrl(
    `/api/payments/dev/confirm?session_id=${encodeURIComponent(providerSessionId)}&locale=${locale}`
  );
  const cancelUrl = buildAppUrl(`/${locale}/payments/cancel?bookingId=${summary.bookingId}`);

  const checkoutResult = await admin.from("checkout_sessions").upsert(
    {
      amount_total_minor: summary.totalAmountMinor,
      booking_id: summary.bookingId,
      cancel_url: cancelUrl,
      completed_at: null,
      currency_code: summary.currency,
      expires_at: expiresAt,
      idempotency_key: idempotencyKey,
      metadata: {
        bookingReference: summary.bookingReference,
        developmentFallback: true
      },
      provider: "stripe",
      provider_session_id: providerSessionId,
      status: "pending",
      success_url: successUrl,
      user_id: userId
    },
    {
      onConflict: "idempotency_key"
    }
  );

  if (checkoutResult.error) {
    throw new Error(checkoutResult.error.message);
  }

  const storedLaunch = {
    checkoutSessionId: providerSessionId,
    checkoutUrl: confirmUrl,
    expiresAt
  };
  const idempotencyWrite = await admin.from("idempotency_keys").upsert(
    {
      idempotency_key: idempotencyKey,
      linked_entity_id: summary.bookingId,
      linked_entity_type: "booking",
      owner_user_id: userId,
      request_hash: requestHash,
      request_scope: requestScope,
      response_body: storedLaunch,
      response_status_code: 200
    },
    {
      onConflict: "request_scope,idempotency_key"
    }
  );

  if (idempotencyWrite.error) {
    throw new Error(idempotencyWrite.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.checkout.created",
    entityId: summary.bookingId,
    entityType: "booking",
    metadata: {
      checkoutSessionId: providerSessionId,
      developmentFallback: true
    },
    targetUserId: userId
  });

  return storedLaunch;
}

export async function createCheckoutSessionForOwnedBooking({
  bookingId,
  locale,
  userId
}: {
  bookingId: string;
  locale: Locale;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  if (!(await isPaymentMethodEnabled("stripe"))) {
    throw new Error("Stripe is not active in Admin Settings.");
  }

  const summary = await getOwnedBookingPaymentSummary(bookingId, userId);

  if (!summary) {
    throw new Error("The selected booking could not be found.");
  }

  if (summary.status !== "pending_payment") {
    throw new Error("Only pending-payment bookings can be sent to checkout.");
  }

  if (summary.paymentStatus === "paid" || summary.paymentStatus === "authorized") {
    throw new Error("This booking has already been paid.");
  }

  const admin = createSupabaseAdminClient();
  const requestScope = "stripe_checkout_session";
  const idempotencyKey = createIdempotencyKey([requestScope, bookingId]);
  const requestHash = buildRequestHash(bookingId, locale);
  const idempotencyLookup = await admin
    .from("idempotency_keys")
    .select("id, response_body")
    .eq("request_scope", requestScope)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  const storedResponse = extractStoredCheckoutResponse(
    (idempotencyLookup.data as {id: string; response_body: unknown} | null)?.response_body
  );

  if (storedResponse?.checkoutUrl) {
    return storedResponse;
  }

  if (await canUseDevelopmentCheckoutFallback()) {
    return createDevelopmentCheckoutSession({
      idempotencyKey,
      locale,
      requestHash,
      requestScope,
      summary,
      userId
    });
  }

  const existingSessionResult = await admin
    .from("checkout_sessions")
    .select("provider_session_id, expires_at, status")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingSession =
    (existingSessionResult.data as
      | {expires_at: string; provider_session_id: string | null; status: string}
      | null) ?? null;

  if (
    existingSession?.provider_session_id &&
    ["pending", "requires_action"].includes(existingSession.status) &&
    new Date(existingSession.expires_at).getTime() > Date.now()
  ) {
    const stripe = await getConfiguredStripeClient();
    const stripeSession = await stripe.checkout.sessions.retrieve(
      existingSession.provider_session_id
    );

    if (stripeSession.url) {
      return {
        checkoutSessionId: stripeSession.id,
        checkoutUrl: stripeSession.url,
        expiresAt: existingSession.expires_at
      };
    }
  }

  const stripe = await getConfiguredStripeClient();
  const successUrl = buildAppUrl(`/${locale}/payments/success?session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl = buildAppUrl(`/${locale}/payments/cancel?bookingId=${bookingId}`);
  const stripeSession = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "required",
      cancel_url: cancelUrl,
      currency: normalizeStripeCurrency(summary.currency),
      customer_email: summary.customerEmail,
      line_items: summary.items.map((item) => ({
        price_data: {
          currency: normalizeStripeCurrency(item.currencyCode),
          product_data: {
            description: item.description ?? undefined,
            name: item.title
          },
          unit_amount: item.totalAmountMinor
        },
        quantity: 1
      })),
      metadata: {
        bookingId: summary.bookingId,
        bookingReference: summary.bookingReference,
        locale,
        userId
      },
      mode: "payment",
      phone_number_collection: {
        enabled: true
      },
      submit_type: "book",
      success_url: successUrl
    },
    {
      idempotencyKey
    }
  );

  if (!stripeSession.url) {
    throw new Error("Stripe did not return a hosted checkout URL.");
  }

  const expiresAt = stripeSession.expires_at
    ? new Date(stripeSession.expires_at * 1000).toISOString()
    : null;
  const checkoutResult = await admin
    .from("checkout_sessions")
    .upsert(
      {
        amount_total_minor: summary.totalAmountMinor,
        booking_id: summary.bookingId,
        cancel_url: cancelUrl,
        completed_at: null,
        currency_code: summary.currency,
        expires_at: expiresAt ?? new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        idempotency_key: idempotencyKey,
        metadata: {
          bookingReference: summary.bookingReference
        },
        provider: "stripe",
        provider_session_id: stripeSession.id,
        status: "pending",
        success_url: successUrl,
        user_id: userId
      },
      {
        onConflict: "idempotency_key"
      }
    );

  if (checkoutResult.error) {
    throw new Error(checkoutResult.error.message);
  }

  const storedLaunch = {
    checkoutSessionId: stripeSession.id,
    checkoutUrl: stripeSession.url,
    expiresAt
  };
  const idempotencyWrite = await admin.from("idempotency_keys").upsert(
    {
      idempotency_key: idempotencyKey,
      linked_entity_id: summary.bookingId,
      linked_entity_type: "booking",
      owner_user_id: userId,
      request_hash: requestHash,
      request_scope: requestScope,
      response_body: storedLaunch,
      response_status_code: 200
    },
    {
      onConflict: "request_scope,idempotency_key"
    }
  );

  if (idempotencyWrite.error) {
    throw new Error(idempotencyWrite.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.checkout.created",
    entityId: summary.bookingId,
    entityType: "booking",
    metadata: {
      checkoutSessionId: stripeSession.id
    },
    targetUserId: userId
  });

  return storedLaunch;
}

export async function completeDevelopmentCheckoutSession({
  locale,
  providerSessionId,
  userId
}: {
  locale: Locale;
  providerSessionId: string;
  userId: string;
}) {
  if (!isDevelopmentCheckoutEnabled()) {
    throw new Error("Development checkout confirmation is disabled.");
  }

  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, status")
    .eq("provider", "stripe")
    .eq("provider_session_id", providerSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {amount_total_minor: number; booking_id: string; status: string}
      | null) ?? null;

  if (!checkout) {
    throw new Error("Development checkout session was not found.");
  }

  if (checkout.status !== "paid") {
    await finalizeSuccessfulStripeCheckoutSession({
      amount_total: checkout.amount_total_minor,
      id: providerSessionId,
      metadata: {
        bookingId: checkout.booking_id,
        locale,
        userId
      },
      payment_intent: `dev_pi_${providerSessionId}`
    } as unknown as Stripe.Checkout.Session);
  }
}

export async function synchronizeStripeCheckoutSessionForUser({
  providerSessionId,
  userId
}: {
  providerSessionId: string;
  userId: string;
}) {
  if (!(await hasStripeSecret()) || providerSessionId.startsWith("dev_stripe_")) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("booking_id, status")
    .eq("provider", "stripe")
    .eq("provider_session_id", providerSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as {booking_id: string; status: string} | null) ?? null;

  if (!checkout || checkout.status === "paid") {
    return;
  }

  const stripe = await getConfiguredStripeClient();
  const stripeSession = await stripe.checkout.sessions.retrieve(providerSessionId);

  if (
    stripeSession.metadata?.bookingId !== checkout.booking_id ||
    stripeSession.metadata?.userId !== userId
  ) {
    return;
  }

  if (stripeSession.payment_status === "paid" || stripeSession.status === "complete") {
    await finalizeSuccessfulStripeCheckoutSession(stripeSession);
  }
}

export async function getOwnedCheckoutCompletionSummary({
  providerSessionId,
  userId
}: {
  providerSessionId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("booking_id, status, completed_at")
    .eq("provider_session_id", providerSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {booking_id: string; completed_at: string | null; status: string}
      | null) ?? null;

  if (!checkout) {
    return null;
  }

  const booking = await getOwnedBookingPaymentSummary(checkout.booking_id, userId);
  const receipt = await getOwnedPaymentReceiptSummary(checkout.booking_id, userId);

  if (!booking) {
    return null;
  }

  return {
    booking,
    checkout,
    receipt
  };
}
