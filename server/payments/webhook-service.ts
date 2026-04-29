import "server-only";

import Stripe from "stripe";

import {getPublicEnv} from "@/lib/env/client";
import {reportServerError} from "@/server/observability/logger";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {sendBookingConfirmationEmail, sendPaymentReceiptEmail} from "@/server/email/transactional";
import {type Json} from "@/types/supabase";

import {createFinanceAuditLog, hasFinanceAuditAction} from "./audit";
import {getBookingPaymentSummaryById} from "./booking-summary";
import {createOrGetPaidInvoiceForBooking} from "./invoice-service";

type WebhookProcessResult = {
  duplicate: boolean;
  status: "failed" | "ignored" | "processed";
};

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
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

type RpcResult<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

function serializeStripeEvent(event: Stripe.Event): Json {
  return JSON.parse(JSON.stringify(event)) as Json;
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

async function upsertWebhookEventReceipt(event: Stripe.Event, signature: string | null) {
  const admin = createSupabaseAdminClient();
  const lookup = await admin
    .from("payment_webhook_events")
    .select("id, processing_attempts, processing_status")
    .eq("external_event_id", event.id)
    .maybeSingle();
  const existing =
    (lookup.data as
      | {id: string; processing_attempts: number; processing_status: string}
      | null) ?? null;

  if (existing?.processing_status === "processed" || existing?.processing_status === "ignored") {
    return {
      attempts: existing.processing_attempts,
      duplicate: true,
      rowId: existing.id
    };
  }

  const write = await admin
    .from("payment_webhook_events")
    .upsert(
      {
        event_type: event.type,
        external_event_id: event.id,
        last_error: null,
        payload: serializeStripeEvent(event),
        processing_attempts: (existing?.processing_attempts ?? 0) + 1,
        processing_status: "received",
        provider: "stripe",
        signature
      },
      {
        onConflict: "external_event_id"
      }
    )
    .select("id")
    .single();

  if (write.error || !write.data?.id) {
    throw new Error(write.error?.message ?? "Unable to store the Stripe webhook event.");
  }

  return {
    attempts: (existing?.processing_attempts ?? 0) + 1,
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

async function updateBookingAfterPaymentFailure({
  bookingId,
  checkoutSessionId,
  paymentStatus,
  userId
}: {
  bookingId: string;
  checkoutSessionId: string;
  paymentStatus: "expired" | "failed";
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const result = await invokeAdminRpc<null>(admin, "mark_checkout_session_payment_terminal", {
    p_booking_id: bookingId,
    p_next_status: paymentStatus,
    p_provider_session_id: checkoutSessionId,
    p_user_id: userId
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function finalizeSuccessfulStripeCheckoutSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const userId = session.metadata?.userId;

  if (!bookingId || !userId) {
    throw new Error("Stripe checkout metadata is missing the booking owner context.");
  }

  const summary = await getBookingPaymentSummaryById(bookingId);

  if (!summary) {
    throw new Error("The booking linked to the Stripe checkout session could not be found.");
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const providerPaymentReference =
    typeof session.payment_intent === "string" && session.payment_intent.length > 0
      ? session.payment_intent
      : session.id;
  const amountTotalMinor =
    typeof session.amount_total === "number" ? session.amount_total : summary.totalAmountMinor;
  const wasConfirmed = summary.status === "confirmed" && summary.paymentStatus === "paid";
  const paymentFinalize = await invokeAdminRpc<string>(admin, "finalize_paid_checkout_session", {
    p_amount_total_minor: amountTotalMinor,
    p_booking_id: bookingId,
    p_completed_at: now,
    p_currency_code: summary.currency,
    p_metadata: {
      checkoutSessionId: session.id
    },
    p_provider_payment_reference: providerPaymentReference,
    p_provider_session_id: session.id,
    p_user_id: userId
  });

  if (paymentFinalize.error || !paymentFinalize.data) {
    throw new Error(
      paymentFinalize.error?.message ?? "Unable to finalize the payment transaction."
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
      checkoutSessionId: session.id,
      invoiceId: invoice.invoiceId
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
      paymentMethod: "Stripe",
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

  if (!wasConfirmed) {
    await createFinanceAuditLog({
      action: "finance.booking.confirmed",
      entityId: bookingId,
      entityType: "booking",
      metadata: {
        checkoutSessionId: session.id,
        paymentId
      },
      targetUserId: userId
    });
  }
}

async function handleRefundEvent(charge: Stripe.Charge) {
  const providerPaymentReference =
    typeof charge.payment_intent === "string" && charge.payment_intent.length > 0
      ? charge.payment_intent
      : charge.id;
  const admin = createSupabaseAdminClient();
  const paymentLookup = await admin
    .from("payments")
    .select("id, booking_id, user_id, currency_code, amount_captured_minor")
    .eq("provider_payment_reference", providerPaymentReference)
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

  const refundedAmountMinor = charge.amount_refunded ?? 0;
  const refundItems = charge.refunds?.data ?? [];

  for (const refund of refundItems) {
    const refundWrite = await admin.from("refunds").upsert(
      {
        amount_minor: refund.amount,
        booking_id: payment.booking_id,
        currency_code: payment.currency_code,
        payment_id: payment.id,
        provider_refund_reference: refund.id,
        reason: refund.reason ?? null,
        status: refund.status === "failed" ? "failed" : refund.status === "canceled" ? "cancelled" : "succeeded",
        user_id: payment.user_id
      },
      {
        onConflict: "provider_refund_reference"
      }
    );

    if (refundWrite.error) {
      throw new Error(refundWrite.error.message);
    }
  }

  const nextPaymentStatus =
    refundedAmountMinor >= payment.amount_captured_minor ? "refunded" : "partially_refunded";
  const refundStatusUpdate = await invokeAdminRpc<null>(admin, "apply_booking_refund_status", {
    p_booking_id: payment.booking_id,
    p_next_booking_status:
      refundedAmountMinor >= payment.amount_captured_minor ? "refunded" : "confirmed",
    p_next_payment_status: nextPaymentStatus,
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
      refundedAmountMinor
    },
    targetUserId: payment.user_id
  });
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  signature: string | null
): Promise<WebhookProcessResult> {
  const receipt = await upsertWebhookEventReceipt(event, signature);

  if (receipt.duplicate) {
    return {
      duplicate: true,
      status: "processed"
    };
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await finalizeSuccessfulStripeCheckoutSession(event.data.object as Stripe.Checkout.Session);
      await finalizeWebhookEvent(receipt.rowId, "processed");
      return {
        duplicate: false,
        status: "processed"
      };
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const userId = session.metadata?.userId;

      if (bookingId && userId) {
        await updateBookingAfterPaymentFailure({
          bookingId,
          checkoutSessionId: session.id,
          paymentStatus: "expired",
          userId
        });
      }

      await finalizeWebhookEvent(receipt.rowId, "processed");
      return {
        duplicate: false,
        status: "processed"
      };
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const userId = session.metadata?.userId;

      if (bookingId && userId) {
        await updateBookingAfterPaymentFailure({
          bookingId,
          checkoutSessionId: session.id,
          paymentStatus: "failed",
          userId
        });
      }

      await finalizeWebhookEvent(receipt.rowId, "processed");
      return {
        duplicate: false,
        status: "processed"
      };
    }

    if (event.type === "charge.refunded") {
      await handleRefundEvent(event.data.object as Stripe.Charge);
      await finalizeWebhookEvent(receipt.rowId, "processed");
      return {
        duplicate: false,
        status: "processed"
      };
    }

    await finalizeWebhookEvent(receipt.rowId, "ignored");
    return {
      duplicate: false,
      status: "ignored"
    };
  } catch (error) {
    reportServerError("stripe.webhook.processing_exception", error, {
      eventId: event.id,
      eventType: event.type
    });
    await finalizeWebhookEvent(
      receipt.rowId,
      "failed",
      error instanceof Error ? error.message : "Unhandled payment webhook processing failure."
    );
    throw error;
  }
}
