import "server-only";

import {createHash, randomUUID} from "crypto";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {createFinanceAuditLog} from "@/server/payments/audit";
import {getOwnedBookingPaymentSummary} from "@/server/payments/booking-summary";
import {
  getRequiredPaymentProviderSecret,
  requireEnabledPaymentMethod
} from "@/server/payments/payment-methods";
import {finalizeSuccessfulProviderCheckoutPayment} from "@/server/payments/provider-finalization";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {type CheckoutSessionLaunch} from "./types";

type KorapayEnvelope<T> = {
  data: T;
  message: string;
  status: boolean;
};

type KorapayChargeData = {
  amount: number | string;
  amount_expected?: number | string;
  amount_paid?: number | string;
  currency: string;
  payment_reference?: string;
  reference: string;
  status: string;
  transaction_status?: string;
};

type KorapayWebhookEvent = {
  data?: Record<string, unknown>;
  event?: string;
};

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
}

function createKorapayReference(bookingId: string) {
  return `kora-${bookingId.replaceAll("-", "")}-${Date.now()}`;
}

function amountMinorToProviderAmount(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

function providerAmountToMinor(amount: number | string | undefined) {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return Math.round(numericAmount * 100);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function callKorapay<T>(path: string, init: RequestInit) {
  const secretKey = await getRequiredPaymentProviderSecret("korapay", "secretKey");
  const response = await fetch(`https://api.korapay.com/merchant/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const payload = (await response.json()) as KorapayEnvelope<T> & {message?: string};

  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? `Korapay request failed with ${response.status}.`);
  }

  return payload.data;
}

async function verifyKorapayCharge(reference: string) {
  return callKorapay<KorapayChargeData>(`/charges/${encodeURIComponent(reference)}`, {
    method: "GET"
  });
}

export async function initializeKorapayCheckoutForOwnedBooking({
  bookingId,
  locale,
  userId
}: {
  bookingId: string;
  locale: Locale;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  await requireEnabledPaymentMethod("korapay");

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
  const existingSessionResult = await admin
    .from("checkout_sessions")
    .select("provider_session_id, expires_at, status")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .eq("provider", "korapay")
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingSession =
    (existingSessionResult.data as
      | {expires_at: string; provider_session_id: string | null; status: string}
      | null) ?? null;

  if (
    existingSession?.provider_session_id &&
    existingSession.status === "pending" &&
    new Date(existingSession.expires_at).getTime() > Date.now()
  ) {
    return {
      checkoutSessionId: existingSession.provider_session_id,
      checkoutUrl: buildAppUrl(
        `/${locale}/payments/korapay/checkout?reference=${encodeURIComponent(existingSession.provider_session_id)}`
      ),
      expiresAt: existingSession.expires_at
    };
  }

  const reference = createKorapayReference(bookingId);
  const expiresAt = summary.expiresAt ?? new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const checkoutUrl = buildAppUrl(
    `/${locale}/payments/korapay/checkout?reference=${encodeURIComponent(reference)}`
  );
  const checkoutWrite = await admin.from("checkout_sessions").insert({
    amount_total_minor: summary.totalAmountMinor,
    booking_id: summary.bookingId,
    cancel_url: buildAppUrl(`/${locale}/payments/cancel?bookingId=${bookingId}`),
    completed_at: null,
    currency_code: summary.currency,
    expires_at: expiresAt,
    idempotency_key: createHash("sha256").update(reference).digest("hex"),
    metadata: {
      bookingReference: summary.bookingReference
    },
    provider: "korapay",
    provider_session_id: reference,
    status: "pending",
    success_url: checkoutUrl,
    user_id: userId
  });

  if (checkoutWrite.error) {
    throw new Error(checkoutWrite.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.checkout.created",
    entityId: summary.bookingId,
    entityType: "booking",
    metadata: {
      checkoutReference: reference,
      provider: "korapay"
    },
    targetUserId: userId
  });

  return {
    checkoutSessionId: reference,
    checkoutUrl,
    expiresAt
  };
}

export async function getOwnedKorapayCheckout({
  reference,
  userId
}: {
  reference: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, currency_code, expires_at, provider_session_id, status")
    .eq("provider", "korapay")
    .eq("provider_session_id", reference)
    .eq("user_id", userId)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {
          amount_total_minor: number;
          booking_id: string;
          currency_code: string;
          expires_at: string;
          provider_session_id: string | null;
          status: string;
        }
      | null) ?? null;

  if (!checkout?.provider_session_id) {
    return null;
  }

  const booking = await getOwnedBookingPaymentSummary(checkout.booking_id, userId);

  if (!booking) {
    return null;
  }

  return {
    amount: amountMinorToProviderAmount(checkout.amount_total_minor),
    booking,
    checkout: {
      expiresAt: checkout.expires_at,
      reference: checkout.provider_session_id,
      status: checkout.status
    },
    publicKey: await getRequiredPaymentProviderSecret("korapay", "publicKey")
  };
}

async function finalizeVerifiedKorapayPayment({
  charge,
  reference
}: {
  charge: KorapayChargeData;
  reference: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, currency_code, user_id")
    .eq("provider", "korapay")
    .eq("provider_session_id", reference)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {
          amount_total_minor: number;
          booking_id: string;
          currency_code: string;
          user_id: string;
        }
      | null) ?? null;

  if (!checkout) {
    throw new Error("The Korapay checkout session could not be found.");
  }

  const merchantReference = charge.payment_reference ?? charge.reference;

  if (merchantReference !== reference && charge.reference !== reference) {
    throw new Error("Korapay transaction reference mismatch.");
  }

  const status = charge.transaction_status ?? charge.status;

  if (status !== "success") {
    return {
      bookingId: checkout.booking_id,
      message: "Payment is still processing or failed.",
      reference,
      status
    };
  }

  if (charge.currency !== checkout.currency_code) {
    throw new Error("Korapay transaction currency mismatch.");
  }

  const paidAmountMinor = providerAmountToMinor(
    charge.amount_paid ?? charge.amount_expected ?? charge.amount
  );

  if (paidAmountMinor < checkout.amount_total_minor) {
    throw new Error("Korapay transaction amount is lower than the booking total.");
  }

  await finalizeSuccessfulProviderCheckoutPayment({
    amountMinor: checkout.amount_total_minor,
    bookingId: checkout.booking_id,
    checkoutReference: reference,
    metadata: {
      korapayReference: charge.reference
    },
    paymentMethodLabel: "Korapay",
    provider: "korapay",
    providerPaymentReference: charge.reference,
    userId: checkout.user_id
  });

  return {
    bookingId: checkout.booking_id,
    message: "Payment verified successfully.",
    reference,
    status
  };
}

export async function verifyKorapayCheckoutForOwnedBooking({
  reference,
  userId
}: {
  reference: string;
  userId: string;
}) {
  const checkoutResult = await createSupabaseAdminClient()
    .from("checkout_sessions")
    .select("booking_id")
    .eq("provider", "korapay")
    .eq("provider_session_id", reference)
    .eq("user_id", userId)
    .maybeSingle();

  if (!checkoutResult.data) {
    throw new Error("The Korapay payment session could not be found.");
  }

  const charge = await verifyKorapayCharge(reference);
  return finalizeVerifiedKorapayPayment({
    charge,
    reference
  });
}

async function upsertWebhookEventReceipt(
  event: KorapayWebhookEvent,
  signature: string | null
) {
  const data = asRecord(event.data);
  const externalEventId =
    typeof data.reference === "string"
      ? `${event.event ?? "unknown"}:${data.reference}`
      : `${event.event ?? "unknown"}:${randomUUID()}`;
  const admin = createSupabaseAdminClient();
  const lookup = await admin
    .from("payment_webhook_events")
    .select("id, processing_status")
    .eq("external_event_id", externalEventId)
    .maybeSingle();
  const existing =
    (lookup.data as {id: string; processing_status: string} | null) ?? null;

  if (existing?.processing_status === "processed" || existing?.processing_status === "ignored") {
    return {
      duplicate: true,
      rowId: existing.id
    };
  }

  const write = await admin
    .from("payment_webhook_events")
    .upsert(
      {
        event_type: event.event ?? "unknown",
        external_event_id: externalEventId,
        last_error: null,
        payload: event as unknown as Json,
        processing_attempts: 1,
        processing_status: "received",
        provider: "korapay",
        signature
      },
      {
        onConflict: "external_event_id"
      }
    )
    .select("id")
    .single();

  if (write.error || !write.data?.id) {
    throw new Error(write.error?.message ?? "Unable to store the Korapay webhook event.");
  }

  return {
    duplicate: false,
    rowId: (write.data as {id: string}).id
  };
}

async function finalizeWebhookEvent(
  rowId: string,
  status: "failed" | "ignored" | "processed",
  errorMessage?: string
) {
  const admin = createSupabaseAdminClient();
  const update = await admin
    .from("payment_webhook_events")
    .update({
      last_error: errorMessage ?? null,
      processed_at: status === "processed" || status === "ignored" ? new Date().toISOString() : null,
      processing_status: status
    })
    .eq("id", rowId);

  if (update.error) {
    throw new Error(update.error.message);
  }
}

export async function processKorapayWebhookEvent(
  event: KorapayWebhookEvent,
  signature: string | null
) {
  const receipt = await upsertWebhookEventReceipt(event, signature);

  if (receipt.duplicate) {
    return;
  }

  try {
    const data = asRecord(event.data);
    const reference =
      typeof data.payment_reference === "string"
        ? data.payment_reference
        : typeof data.reference === "string"
          ? data.reference
          : null;

    if (event.event !== "charge.success" || !reference) {
      await finalizeWebhookEvent(receipt.rowId, "ignored");
      return;
    }

    const charge = await verifyKorapayCharge(reference);
    await finalizeVerifiedKorapayPayment({
      charge,
      reference
    });
    await finalizeWebhookEvent(receipt.rowId, "processed");
  } catch (error) {
    await finalizeWebhookEvent(
      receipt.rowId,
      "failed",
      error instanceof Error ? error.message : "Unhandled Korapay webhook failure."
    );
    throw error;
  }
}
