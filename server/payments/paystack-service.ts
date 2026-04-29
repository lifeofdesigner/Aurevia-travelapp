import "server-only";

import {createHash, randomUUID} from "crypto";

import {getPublicEnv} from "@/lib/env/client";
import {createFinanceAuditLog, hasFinanceAuditAction} from "@/server/payments/audit";
import {createOrGetPaidInvoiceForBooking} from "@/server/payments/invoice-service";
import {
  getBookingPaymentSummaryById,
  getOwnedBookingPaymentSummary
} from "@/server/payments/booking-summary";
import {reportServerError} from "@/server/observability/logger";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";
import {sendBookingConfirmationEmail, sendPaymentReceiptEmail} from "@/server/email/transactional";
import {requireEnabledPaymentMethod} from "@/server/payments/payment-methods";

import {initializeTransaction, verifyTransaction} from "./paystack-client";
import {type CheckoutSessionLaunch} from "./types";

type RpcResult<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

type PaystackWebhookEvent = {
  data?: Record<string, unknown>;
  event?: string;
};

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
}

function createPaystackReference(bookingId: string) {
  return `aurevia-${bookingId.replaceAll("-", "")}-${Date.now()}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildPassengerNames(travelers: Record<string, unknown>[]) {
  return travelers
    .map((traveler) => {
      const firstName = typeof traveler.firstName === "string" ? traveler.firstName : "";
      const lastName = typeof traveler.lastName === "string" ? traveler.lastName : "";
      return [firstName, lastName].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);
}

async function invokeAdminRpc<T>(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  functionName: string,
  args: Record<string, unknown>
) {
  const rpc = admin.rpc.bind(admin) as unknown as (
    nextFunctionName: string,
    nextArgs?: Record<string, unknown>
  ) => Promise<RpcResult<T>>;

  return rpc(functionName, args);
}

async function finalizeSuccessfulPaystackPayment({
  amountMinor,
  bookingId,
  checkoutReference,
  metadata,
  providerPaymentReference,
  userId
}: {
  amountMinor: number;
  bookingId: string;
  checkoutReference: string;
  metadata: Record<string, unknown>;
  providerPaymentReference: string;
  userId: string;
}) {
  const summary = await getBookingPaymentSummaryById(bookingId);

  if (!summary) {
    throw new Error("The booking linked to the Paystack payment could not be found.");
  }

  if (summary.status === "confirmed" && summary.paymentStatus === "paid") {
    return;
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const paymentFinalize = await invokeAdminRpc<string>(admin, "finalize_paid_checkout_session", {
    p_amount_total_minor: amountMinor,
    p_booking_id: bookingId,
    p_completed_at: now,
    p_currency_code: summary.currency,
    p_metadata: {
      ...metadata,
      paystackReference: checkoutReference
    },
    p_provider: "paystack",
    p_provider_payment_reference: providerPaymentReference,
    p_provider_session_id: checkoutReference,
    p_user_id: userId
  });

  if (paymentFinalize.error || !paymentFinalize.data) {
    throw new Error(
      paymentFinalize.error?.message ?? "Unable to finalize the Paystack payment."
    );
  }

  const paymentId = paymentFinalize.data as string;
  const invoice = await createOrGetPaidInvoiceForBooking(bookingId);

  await createFinanceAuditLog({
    action: "finance.payment.captured",
    entityId: paymentId,
    entityType: "payment",
    metadata: {
      bookingId,
      checkoutReference,
      invoiceId: invoice.invoiceId,
      provider: "paystack"
    },
    targetUserId: userId
  });

  const bookingEmailAlreadySent = await hasFinanceAuditAction({
    action: "finance.email.booking_confirmation_sent",
    entityId: bookingId,
    entityType: "booking"
  });

  if (!bookingEmailAlreadySent) {
    await sendBookingConfirmationEmail({
      bookingReference: summary.bookingReference,
      bookingTitle: summary.items[0]?.title ?? summary.primaryBookingType,
      detailLines: summary.items.map((item) => item.title),
      locale: summary.locale,
      passengerNames: buildPassengerNames(summary.travelerSummary),
      supportHref: buildAppUrl(`/${summary.locale}/dashboard`),
      ticketHref: buildAppUrl(`/${summary.locale}/dashboard/bookings/${bookingId}`),
      to: summary.customerEmail,
      totalAmount: {
        amountMinor: summary.totalAmountMinor,
        currency: summary.currency
      }
    });
    await createFinanceAuditLog({
      action: "finance.email.booking_confirmation_sent",
      entityId: bookingId,
      entityType: "booking",
      metadata: {
        invoiceId: invoice.invoiceId
      },
      targetUserId: userId
    });
  }

  const receiptEmailAlreadySent = await hasFinanceAuditAction({
    action: "finance.email.payment_receipt_sent",
    entityId: invoice.invoiceId,
    entityType: "invoice"
  });

  if (!receiptEmailAlreadySent) {
    await sendPaymentReceiptEmail({
      amountPaid: {
        amountMinor: summary.totalAmountMinor,
        currency: summary.currency
      },
      bookingReference: summary.bookingReference,
      invoiceNumber: invoice.invoiceNumber,
      locale: summary.locale,
      paidAt: new Date().toLocaleDateString(summary.locale),
      paymentMethod: "Paystack",
      to: summary.customerEmail
    });
    await createFinanceAuditLog({
      action: "finance.email.payment_receipt_sent",
      entityId: invoice.invoiceId,
      entityType: "invoice",
      metadata: {
        bookingId
      },
      targetUserId: userId
    });
  }

  await createFinanceAuditLog({
    action: "finance.booking.confirmed",
    entityId: bookingId,
    entityType: "booking",
    metadata: {
      checkoutReference,
      paymentId,
      provider: "paystack"
    },
    targetUserId: userId
  });
}

async function upsertWebhookEventReceipt(event: PaystackWebhookEvent, signature: string | null) {
  const data = asRecord(event.data);
  const externalEventId =
    typeof data.reference === "string"
      ? `${event.event ?? "unknown"}:${data.reference}`
      : typeof data.transaction_reference === "string"
        ? `${event.event ?? "unknown"}:${data.transaction_reference}`
        : `${event.event ?? "unknown"}:${randomUUID()}`;
  const admin = createSupabaseAdminClient();
  const lookup = await admin
    .from("payment_webhook_events")
    .select("id, processing_attempts, processing_status")
    .eq("external_event_id", externalEventId)
    .maybeSingle();
  const existing =
    (lookup.data as
      | {id: string; processing_attempts: number; processing_status: string}
      | null) ?? null;

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
        processing_attempts: (existing?.processing_attempts ?? 0) + 1,
        processing_status: "received",
        provider: "paystack",
        signature
      },
      {
        onConflict: "external_event_id"
      }
    )
    .select("id")
    .single();

  if (write.error || !write.data?.id) {
    throw new Error(write.error?.message ?? "Unable to store the Paystack webhook event.");
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

export async function initializePaystackCheckoutForOwnedBooking({
  bookingId,
  userId
}: {
  bookingId: string;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  await requireEnabledPaymentMethod("paystack");

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

  if (summary.currency !== "NGN") {
    throw new Error("Paystack checkout is currently available only for NGN bookings.");
  }

  const admin = createSupabaseAdminClient();
  const existingSessionResult = await admin
    .from("checkout_sessions")
    .select("provider_session_id, expires_at, status, metadata")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .eq("provider", "paystack")
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingSession =
    (existingSessionResult.data as
      | {
          expires_at: string;
          metadata: Json;
          provider_session_id: string | null;
          status: string;
        }
      | null) ?? null;
  const existingMetadata = asRecord(existingSession?.metadata);
  const storedCheckoutUrl =
    typeof existingMetadata.authorizationUrl === "string"
      ? existingMetadata.authorizationUrl
      : null;

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

  const reference = createPaystackReference(bookingId);
  const callbackUrl = buildAppUrl(`/${summary.locale}/payments/paystack/callback`);
  const cancelUrl = buildAppUrl(`/${summary.locale}/payments/cancel?bookingId=${bookingId}`);
  const response = await initializeTransaction(
    summary.customerEmail,
    summary.totalAmountMinor,
    summary.currency,
    {
      bookingId: summary.bookingId,
      bookingReference: summary.bookingReference,
      locale: summary.locale,
      userId
    },
    callbackUrl,
    reference
  );

  const checkoutWrite = await admin.from("checkout_sessions").insert({
    amount_total_minor: summary.totalAmountMinor,
    booking_id: summary.bookingId,
    cancel_url: cancelUrl,
    completed_at: null,
    currency_code: summary.currency,
    expires_at: summary.expiresAt ?? new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    idempotency_key: createHash("sha256").update(reference).digest("hex"),
    metadata: {
      accessCode: response.access_code,
      authorizationUrl: response.authorization_url,
      bookingReference: summary.bookingReference
    },
    provider: "paystack",
    provider_session_id: response.reference,
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
      checkoutReference: response.reference,
      provider: "paystack"
    },
    targetUserId: userId
  });

  return {
    checkoutSessionId: response.reference,
    checkoutUrl: response.authorization_url,
    expiresAt: null
  };
}

export async function verifyPaystackCheckoutForOwnedBooking({
  reference,
  userId
}: {
  reference: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("booking_id, user_id, metadata")
    .eq("provider_session_id", reference)
    .eq("provider", "paystack")
    .eq("user_id", userId)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {
          booking_id: string;
          metadata: Json;
          user_id: string;
        }
      | null) ?? null;

  if (!checkout) {
    throw new Error("The Paystack payment session could not be found.");
  }

  const verification = await verifyTransaction(reference);

  if (verification.status !== "success") {
    return {
      bookingId: checkout.booking_id,
      message: verification.gateway_response ?? "Payment is still processing.",
      reference,
      status: verification.status
    };
  }

  const metadata = asRecord(verification.metadata);

  await finalizeSuccessfulPaystackPayment({
    amountMinor: verification.amount,
    bookingId: checkout.booking_id,
    checkoutReference: reference,
    metadata,
    providerPaymentReference: verification.reference,
    userId
  });

  return {
    bookingId: checkout.booking_id,
    message: "Payment verified successfully.",
    reference,
    status: verification.status
  };
}

async function handleProcessedRefund(data: Record<string, unknown>) {
  const transactionReference =
    typeof data.transaction_reference === "string" ? data.transaction_reference : null;

  if (!transactionReference) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const paymentLookup = await admin
    .from("payments")
    .select("id, booking_id, user_id, currency_code, amount_captured_minor")
    .eq("provider", "paystack")
    .eq("provider_payment_reference", transactionReference)
    .maybeSingle();
  const payment =
    (paymentLookup.data as
      | {
          amount_captured_minor: number;
          booking_id: string;
          currency_code: string;
          id: string;
          user_id: string;
        }
      | null) ?? null;

  if (!payment) {
    return;
  }

  const refundedAmountMinor = Number(data.amount ?? 0);
  const refundReference =
    typeof data.refund_reference === "string"
      ? data.refund_reference
      : `paystack-refund-${transactionReference}`;
  const refundWrite = await admin.from("refunds").upsert(
    {
      amount_minor: refundedAmountMinor,
      booking_id: payment.booking_id,
      currency_code: payment.currency_code,
      payment_id: payment.id,
      provider_refund_reference: refundReference,
      reason: typeof data.status === "string" ? data.status : null,
      status: "succeeded",
      user_id: payment.user_id
    },
    {
      onConflict: "provider_refund_reference"
    }
  );

  if (refundWrite.error) {
    throw new Error(refundWrite.error.message);
  }

  const refundStatusUpdate = await invokeAdminRpc<null>(admin, "apply_booking_refund_status", {
    p_booking_id: payment.booking_id,
    p_next_booking_status:
      refundedAmountMinor >= payment.amount_captured_minor ? "refunded" : "confirmed",
    p_next_payment_status:
      refundedAmountMinor >= payment.amount_captured_minor ? "refunded" : "partially_refunded",
    p_payment_id: payment.id,
    p_refunded_amount_minor: refundedAmountMinor
  });

  if (refundStatusUpdate.error) {
    throw new Error(refundStatusUpdate.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.refund.updated",
    entityId: payment.id,
    entityType: "payment",
    metadata: {
      provider: "paystack",
      refundedAmountMinor
    },
    targetUserId: payment.user_id
  });
}

export async function processPaystackWebhookEvent(event: PaystackWebhookEvent, signature: string | null) {
  const receipt = await upsertWebhookEventReceipt(event, signature);

  if (receipt.duplicate) {
    return;
  }

  try {
    const data = asRecord(event.data);

    if (event.event === "charge.success") {
      const reference =
        typeof data.reference === "string" ? data.reference : null;

      if (reference) {
        const checkoutResult = await createSupabaseAdminClient()
          .from("checkout_sessions")
          .select("booking_id, user_id")
          .eq("provider_session_id", reference)
          .eq("provider", "paystack")
          .maybeSingle();
        const checkout =
          (checkoutResult.data as
            | {booking_id: string; user_id: string}
            | null) ?? null;

        if (checkout) {
          const metadata = asRecord(data.metadata);
          await finalizeSuccessfulPaystackPayment({
            amountMinor: Number(data.amount ?? 0),
            bookingId: checkout.booking_id,
            checkoutReference: reference,
            metadata,
            providerPaymentReference: reference,
            userId: checkout.user_id
          });
        }
      }

      await finalizeWebhookEvent(receipt.rowId, "processed");
      return;
    }

    if (event.event === "refund.processed") {
      await handleProcessedRefund(data);
      await finalizeWebhookEvent(receipt.rowId, "processed");
      return;
    }

    await finalizeWebhookEvent(receipt.rowId, "ignored");
  } catch (error) {
    reportServerError("paystack.webhook.processing_exception", error, {
      eventType: event.event ?? "unknown"
    });
    await finalizeWebhookEvent(
      receipt.rowId,
      "failed",
      error instanceof Error ? error.message : "Unhandled Paystack webhook processing failure."
    );
    throw error;
  }
}
