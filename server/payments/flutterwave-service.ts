import "server-only";

import {createHash, randomUUID} from "crypto";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {createFinanceAuditLog} from "@/server/payments/audit";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getOwnedBookingPaymentSummary} from "@/server/payments/booking-summary";
import {
  getRequiredPaymentProviderSecret,
  requireEnabledPaymentMethod
} from "@/server/payments/payment-methods";
import {finalizeSuccessfulProviderCheckoutPayment} from "@/server/payments/provider-finalization";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {type CheckoutSessionLaunch} from "./types";

type FlutterwaveEnvelope<T> = {
  data: T | null;
  message: string;
  status: "error" | "success";
};

type FlutterwavePaymentResponse = {
  link: string;
};

type FlutterwaveTransactionData = {
  amount: number;
  app_fee?: number;
  charged_amount?: number;
  currency: string;
  flw_ref?: string;
  id: number;
  processor_response?: string;
  status: string;
  tx_ref: string;
};

type FlutterwaveWebhookEvent = {
  data?: Record<string, unknown>;
  event?: string;
};

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
}

function createFlutterwaveReference(bookingId: string) {
  return `flw-${bookingId.replaceAll("-", "")}-${Date.now()}`;
}

function amountMinorToProviderAmount(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

function providerAmountToMinor(amount: number) {
  return Math.round(amount * 100);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function callFlutterwave<T>(path: string, init: RequestInit) {
  const secretKey = await getRequiredPaymentProviderSecret("flutterwave", "secretKey");
  const response = await fetch(`https://api.flutterwave.com/v3${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const payload = (await response.json()) as FlutterwaveEnvelope<T>;

  if (!response.ok || payload.status !== "success" || !payload.data) {
    throw new Error(payload.message ?? `Flutterwave request failed with ${response.status}.`);
  }

  return payload.data;
}

async function verifyFlutterwaveTransaction(transactionId: string) {
  return callFlutterwave<FlutterwaveTransactionData>(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      method: "GET"
    }
  );
}

export async function initializeFlutterwaveCheckoutForOwnedBooking({
  bookingId,
  locale,
  userId
}: {
  bookingId: string;
  locale: Locale;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  await requireEnabledPaymentMethod("flutterwave");

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
    .select("provider_session_id, expires_at, status, metadata")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .eq("provider", "flutterwave")
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingSession =
    (existingSessionResult.data as
      | {expires_at: string; metadata: Json; provider_session_id: string | null; status: string}
      | null) ?? null;
  const existingMetadata = asRecord(existingSession?.metadata);
  const storedCheckoutUrl =
    typeof existingMetadata.checkoutUrl === "string" ? existingMetadata.checkoutUrl : null;

  if (
    existingSession?.provider_session_id &&
    storedCheckoutUrl &&
    existingSession.status === "pending" &&
    new Date(existingSession.expires_at).getTime() > Date.now()
  ) {
    return {
      checkoutSessionId: existingSession.provider_session_id,
      checkoutUrl: storedCheckoutUrl,
      expiresAt: existingSession.expires_at
    };
  }

  const reference = createFlutterwaveReference(bookingId);
  const callbackUrl = buildAppUrl(`/${locale}/payments/flutterwave/callback`);
  const cancelUrl = buildAppUrl(`/${locale}/payments/cancel?bookingId=${bookingId}`);
  const branding = await getSiteBranding();
  const checkout = await callFlutterwave<FlutterwavePaymentResponse>("/payments", {
    body: JSON.stringify({
      amount: amountMinorToProviderAmount(summary.totalAmountMinor),
      currency: summary.currency,
      customer: {
        email: summary.customerEmail,
        phonenumber: summary.customerPhone ?? undefined
      },
      customizations: {
        description: `Booking ${summary.bookingReference}`,
        logo: branding.logoUrl ?? buildAppUrl("/icon.png"),
        title: branding.siteName
      },
      meta: {
        bookingId: summary.bookingId,
        bookingReference: summary.bookingReference,
        locale,
        userId
      },
      redirect_url: callbackUrl,
      tx_ref: reference
    }),
    method: "POST"
  });
  const expiresAt = summary.expiresAt ?? new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const checkoutWrite = await admin.from("checkout_sessions").insert({
    amount_total_minor: summary.totalAmountMinor,
    booking_id: summary.bookingId,
    cancel_url: cancelUrl,
    completed_at: null,
    currency_code: summary.currency,
    expires_at: expiresAt,
    idempotency_key: createHash("sha256").update(reference).digest("hex"),
    metadata: {
      bookingReference: summary.bookingReference,
      checkoutUrl: checkout.link
    },
    provider: "flutterwave",
    provider_session_id: reference,
    status: "pending",
    success_url: callbackUrl,
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
      provider: "flutterwave"
    },
    targetUserId: userId
  });

  return {
    checkoutSessionId: reference,
    checkoutUrl: checkout.link,
    expiresAt
  };
}

async function finalizeVerifiedFlutterwavePayment({
  checkoutReference,
  transaction
}: {
  checkoutReference: string;
  transaction: FlutterwaveTransactionData;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, currency_code, user_id")
    .eq("provider", "flutterwave")
    .eq("provider_session_id", checkoutReference)
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
    throw new Error("The Flutterwave checkout session could not be found.");
  }

  if (transaction.tx_ref !== checkoutReference) {
    throw new Error("Flutterwave transaction reference mismatch.");
  }

  if (transaction.status !== "successful") {
    return {
      bookingId: checkout.booking_id,
      message: transaction.processor_response ?? "Payment is not successful yet.",
      reference: checkoutReference,
      status: transaction.status
    };
  }

  if (transaction.currency !== checkout.currency_code) {
    throw new Error("Flutterwave transaction currency mismatch.");
  }

  const chargedAmountMinor = providerAmountToMinor(
    transaction.charged_amount ?? transaction.amount
  );

  if (chargedAmountMinor < checkout.amount_total_minor) {
    throw new Error("Flutterwave transaction amount is lower than the booking total.");
  }

  await finalizeSuccessfulProviderCheckoutPayment({
    amountMinor: checkout.amount_total_minor,
    bookingId: checkout.booking_id,
    checkoutReference,
    metadata: {
      flutterwaveId: transaction.id,
      flutterwaveReference: transaction.flw_ref ?? null
    },
    paymentMethodLabel: "Flutterwave",
    provider: "flutterwave",
    providerPaymentReference: String(transaction.id),
    userId: checkout.user_id
  });

  return {
    bookingId: checkout.booking_id,
    message: "Payment verified successfully.",
    reference: checkoutReference,
    status: transaction.status
  };
}

export async function verifyFlutterwaveCheckoutForOwnedBooking({
  checkoutReference,
  transactionId,
  userId
}: {
  checkoutReference: string;
  transactionId: string;
  userId: string;
}) {
  const checkoutResult = await createSupabaseAdminClient()
    .from("checkout_sessions")
    .select("booking_id")
    .eq("provider", "flutterwave")
    .eq("provider_session_id", checkoutReference)
    .eq("user_id", userId)
    .maybeSingle();

  if (!checkoutResult.data) {
    throw new Error("The Flutterwave payment session could not be found.");
  }

  const transaction = await verifyFlutterwaveTransaction(transactionId);
  return finalizeVerifiedFlutterwavePayment({
    checkoutReference,
    transaction
  });
}

async function upsertWebhookEventReceipt(
  event: FlutterwaveWebhookEvent,
  signature: string | null
) {
  const data = asRecord(event.data);
  const externalEventId =
    typeof data.id === "number" || typeof data.id === "string"
      ? `${event.event ?? "unknown"}:${String(data.id)}`
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
        provider: "flutterwave",
        signature
      },
      {
        onConflict: "external_event_id"
      }
    )
    .select("id")
    .single();

  if (write.error || !write.data?.id) {
    throw new Error(write.error?.message ?? "Unable to store the Flutterwave webhook event.");
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

export async function processFlutterwaveWebhookEvent(
  event: FlutterwaveWebhookEvent,
  signature: string | null
) {
  const receipt = await upsertWebhookEventReceipt(event, signature);

  if (receipt.duplicate) {
    return;
  }

  try {
    const data = asRecord(event.data);
    const transactionId =
      typeof data.id === "number" || typeof data.id === "string" ? String(data.id) : null;
    const checkoutReference = typeof data.tx_ref === "string" ? data.tx_ref : null;

    if (!transactionId || !checkoutReference) {
      await finalizeWebhookEvent(receipt.rowId, "ignored");
      return;
    }

    const transaction = await verifyFlutterwaveTransaction(transactionId);
    await finalizeVerifiedFlutterwavePayment({
      checkoutReference,
      transaction
    });
    await finalizeWebhookEvent(receipt.rowId, "processed");
  } catch (error) {
    await finalizeWebhookEvent(
      receipt.rowId,
      "failed",
      error instanceof Error ? error.message : "Unhandled Flutterwave webhook failure."
    );
    throw error;
  }
}
