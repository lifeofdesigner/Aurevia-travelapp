import "server-only";

import {getPublicEnv} from "@/lib/env/client";
import {hasPermission, PERMISSIONS} from "@/lib/permissions";
import {toMinorUnit, type SupportedCurrency} from "@/lib/money";
import {reportServerError} from "@/server/observability/logger";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getBookingPaymentSummaryById} from "@/server/payments/booking-summary";
import {type BookingStatus, type PaymentStatus} from "@/types/database-enums";
import {createEmailProvider} from "@/server/email/provider";
import {sendBookingCancellationEmail} from "@/server/email/transactional";
import {confirmBankTransferPaymentForBooking} from "@/server/payments/bank-transfer-service";
import {getConfiguredStripeClient} from "@/server/payments/stripe";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {createAdminAuditLog} from "./audit";
import {type AdminStaffIdentity} from "@/features/admin/types";

type RpcResult<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

function assertBookingManagerAccess(actor: AdminStaffIdentity) {
  if (!hasPermission(actor.role, PERMISSIONS.bookingManageAll)) {
    throw new Error("Forbidden.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapStripeRefundStatus(status: string | null): "cancelled" | "failed" | "pending" | "succeeded" {
  if (status === "failed") {
    return "failed";
  }

  if (status === "canceled") {
    return "cancelled";
  }

  if (status === "pending" || status === "requires_action") {
    return "pending";
  }

  return "succeeded";
}

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
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

export async function updateAdminBookingStatus({
  actor,
  bookingId,
  status
}: {
  actor: AdminStaffIdentity;
  bookingId: string;
  status: BookingStatus;
}) {
  assertBookingManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const bookingResult = await admin
    .from("bookings")
    .select("id, booking_reference, customer_user_id, customer_email, status, confirmed_at")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();
  const booking =
    (bookingResult.data as
      | {
          booking_reference: string;
          confirmed_at: string | null;
          customer_email: string;
          customer_user_id: string;
          id: string;
          status: BookingStatus;
        }
      | null) ?? null;

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const now = new Date().toISOString();
  const bookingUpdate: {
    confirmed_at?: string | null;
    status: BookingStatus;
  } = {status};

  if (status === "confirmed" || status === "partially_confirmed") {
    bookingUpdate.confirmed_at = booking.confirmed_at ?? now;
  }

  const bookingWrite = await admin
    .from("bookings")
    .update(bookingUpdate)
    .eq("id", booking.id)
    .is("deleted_at", null);

  if (bookingWrite.error) {
    throw new Error(bookingWrite.error.message);
  }

  const itemUpdate: {
    cancelled_at?: string | null;
    confirmed_at?: string | null;
    status: BookingStatus;
  } = {status};

  if (status === "confirmed" || status === "partially_confirmed") {
    itemUpdate.confirmed_at = now;
  }

  if (status === "cancelled" || status === "expired") {
    itemUpdate.cancelled_at = now;
  }

  const itemsWrite = await admin
    .from("booking_items")
    .update(itemUpdate)
    .eq("booking_id", booking.id);

  if (itemsWrite.error) {
    throw new Error(itemsWrite.error.message);
  }

  await createAdminAuditLog({
    action: "booking.status.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: booking.id,
    entityType: "booking",
    metadata: {
      nextStatus: status,
      previousStatus: booking.status
    },
    targetUserId: booking.customer_user_id
  });

  if (status === "cancelled" && booking.status !== "cancelled") {
    try {
      const summary = await getBookingPaymentSummaryById(booking.id);

      if (summary?.customerEmail) {
        await sendBookingCancellationEmail({
          bookingReference: summary.bookingReference,
          locale: summary.locale,
          refundAmount: null,
          refundTimeline:
            summary.locale === "de"
              ? "Die Erstattungsberechtigung wird geprueft. Falls eine Rueckerstattung moeglich ist, erfolgt sie in der Regel innerhalb von 7 Werktagen."
              : "Refund eligibility is being reviewed. If a refund applies, it is typically processed within 7 business days.",
          supportHref: buildAppUrl(`/${summary.locale}/dashboard`),
          to: summary.customerEmail
        });
      }
    } catch (error) {
      reportServerError("booking.cancellation_email_failed", error, {
        bookingId: booking.id,
        customerEmail: booking.customer_email
      });
    }
  }
}

export async function createAdminBookingRefund({
  actor,
  amountMajor,
  bookingId,
  reason
}: {
  actor: AdminStaffIdentity;
  amountMajor: number | null;
  bookingId: string;
  reason: string | null;
}) {
  assertBookingManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const bookingResult = await admin
    .from("bookings")
    .select("id, booking_reference, customer_user_id, status")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();
  const paymentResult = await admin
    .from("payments")
    .select(
      "id, booking_id, user_id, provider, provider_payment_reference, amount_captured_minor, amount_refunded_minor, currency_code, status"
    )
    .eq("booking_id", bookingId)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();

  const booking =
    (bookingResult.data as
      | {
          booking_reference: string;
          customer_user_id: string;
          id: string;
          status: BookingStatus;
        }
      | null) ?? null;
  const payment =
    (paymentResult.data as
      | {
          amount_captured_minor: number;
          amount_refunded_minor: number;
          booking_id: string;
          currency_code: SupportedCurrency;
          id: string;
          provider: "bank_transfer" | "flutterwave" | "korapay" | "manual" | "paystack" | "stripe";
          provider_payment_reference: string | null;
          status: PaymentStatus;
          user_id: string;
        }
      | null) ?? null;

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (!payment) {
    throw new Error("No payment record is available for this booking.");
  }

  const remainingAmountMinor = payment.amount_captured_minor - payment.amount_refunded_minor;

  if (remainingAmountMinor <= 0) {
    throw new Error("This booking has already been fully refunded.");
  }

  const requestedAmountMinor =
    amountMajor === null ? remainingAmountMinor : toMinorUnit(amountMajor, payment.currency_code);

  if (requestedAmountMinor <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  if (requestedAmountMinor > remainingAmountMinor) {
    throw new Error("Refund amount exceeds the remaining captured balance.");
  }

  let refundProviderReference: string | null = null;
  let refundStatus: "cancelled" | "failed" | "pending" | "succeeded" = "succeeded";
  let failureMessage: string | null = null;

  if (payment.provider === "stripe") {
    if (!payment.provider_payment_reference) {
      throw new Error("The Stripe payment reference is missing for this booking.");
    }

    const stripe = await getConfiguredStripeClient();
    const stripeRefund = await stripe.refunds.create({
      amount: requestedAmountMinor,
      metadata: {
        adminUserId: actor.userId,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        note: reason ?? ""
      },
      payment_intent: payment.provider_payment_reference
    });

    refundProviderReference = stripeRefund.id;
    refundStatus = mapStripeRefundStatus(stripeRefund.status);
    failureMessage = stripeRefund.failure_reason ?? null;
  }

  const refundInsert =
    refundProviderReference !== null
      ? await admin
          .from("refunds")
          .upsert(
            {
              amount_minor: requestedAmountMinor,
              booking_id: booking.id,
              currency_code: payment.currency_code,
              failure_message: failureMessage,
              payment_id: payment.id,
              provider_refund_reference: refundProviderReference,
              reason,
              status: refundStatus,
              user_id: payment.user_id
            },
            {
              onConflict: "provider_refund_reference"
            }
          )
      : await admin.from("refunds").insert({
          amount_minor: requestedAmountMinor,
          booking_id: booking.id,
          currency_code: payment.currency_code,
          failure_message: failureMessage,
          payment_id: payment.id,
          provider_refund_reference: null,
          reason,
          status: refundStatus,
          user_id: payment.user_id
        });

  if (refundInsert.error) {
    throw new Error(refundInsert.error.message);
  }

  if (refundStatus === "succeeded") {
    const nextRefundedAmountMinor = payment.amount_refunded_minor + requestedAmountMinor;
    const nextPaymentStatus =
      nextRefundedAmountMinor >= payment.amount_captured_minor
        ? "refunded"
        : "partially_refunded";
    const nextBookingStatus =
      nextRefundedAmountMinor >= payment.amount_captured_minor
        ? "refunded"
        : booking.status === "cancelled"
          ? "cancelled"
          : "confirmed";
    const refundStatusUpdate = await invokeAdminRpc<null>(admin, "apply_booking_refund_status", {
      p_booking_id: booking.id,
      p_next_booking_status: nextBookingStatus,
      p_next_payment_status: nextPaymentStatus,
      p_payment_id: payment.id,
      p_refunded_amount_minor: nextRefundedAmountMinor
    });

    if (refundStatusUpdate.error) {
      throw new Error(refundStatusUpdate.error.message);
    }
  }

  await createAdminAuditLog({
    action: "booking.refund.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: booking.id,
    entityType: "booking",
    metadata: {
      amountMinor: requestedAmountMinor,
      currency: payment.currency_code,
      provider: payment.provider,
      refundStatus,
      reason
    },
    targetUserId: booking.customer_user_id
  });

  return {
    amountMinor: requestedAmountMinor,
    currency: payment.currency_code,
    refundStatus
  };
}

export async function confirmAdminBankTransferPayment({
  actor,
  bookingId
}: {
  actor: AdminStaffIdentity;
  bookingId: string;
}) {
  assertBookingManagerAccess(actor);

  await confirmBankTransferPaymentForBooking({
    actorUserId: actor.userId,
    bookingId
  });

  await createAdminAuditLog({
    action: "booking.bank_transfer.confirmed",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: bookingId,
    entityType: "booking",
    metadata: {
      provider: "bank_transfer"
    }
  });
}

export async function sendAdminBookingEmail({
  actor,
  bookingId,
  message,
  replyTo,
  subject
}: {
  actor: AdminStaffIdentity;
  bookingId: string;
  message: string;
  replyTo: string | null;
  subject: string;
}) {
  assertBookingManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const [bookingResult, profileResult] = await Promise.all([
    admin
      .from("bookings")
      .select("id, booking_reference, customer_user_id, customer_email")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .eq("user_id", actor.userId)
      .maybeSingle()
  ]);
  const booking =
    (bookingResult.data as
      | {
          booking_reference: string;
          customer_email: string;
          customer_user_id: string;
          id: string;
        }
      | null) ?? null;
  const actorProfile =
    (profileResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const actorLabel =
    [actorProfile?.first_name, actorProfile?.last_name].filter(Boolean).join(" ") ||
    actor.email;
  const branding = await getSiteBranding();
  const escapedSiteName = escapeHtml(branding.siteName);
  const provider = createEmailProvider();
  const escapedMessage = escapeHtml(message).replaceAll("\n", "<br />");

  await provider.send({
    html: `
      <div style="font-family:Manrope,Arial,sans-serif;background:#f7f3ec;padding:32px;color:#1c3d2e;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
          <div style="background:#1c3d2e;padding:24px 28px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${escapedSiteName}</p>
            <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:30px;color:#f5f0e8;">
              Message About Booking ${escapeHtml(booking.booking_reference)}
            </h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              ${escapedMessage}
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#56705f;">
              Sent by ${escapeHtml(actorLabel)} from ${escapedSiteName}.
            </p>
          </div>
        </div>
      </div>
    `,
    replyTo: replyTo ?? undefined,
    subject,
    text: `${message}\n\nBooking reference: ${booking.booking_reference}\nSent by: ${actorLabel} from ${branding.siteName}`,
    to: [booking.customer_email]
  });

  await createAdminAuditLog({
    action: "booking.customer_email.sent",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: booking.id,
    entityType: "booking",
    metadata: {
      replyTo,
      subject
    },
    targetUserId: booking.customer_user_id
  });
}
