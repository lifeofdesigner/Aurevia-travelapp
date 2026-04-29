import "server-only";

import {getPublicEnv} from "@/lib/env/client";
import {type SupportedCurrency} from "@/lib/money";
import {sendBookingConfirmationEmail, sendPaymentReceiptEmail} from "@/server/email/transactional";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {createFinanceAuditLog, hasFinanceAuditAction} from "./audit";
import {getBookingPaymentSummaryById} from "./booking-summary";
import {createOrGetPaidInvoiceForBooking} from "./invoice-service";

type RpcResult<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

type StoredPaymentProvider = "bank_transfer" | "flutterwave" | "korapay" | "manual" | "paystack" | "stripe";

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

async function finalizePaymentDirectly({
  admin,
  amountMinor,
  bookingId,
  checkoutReference,
  completedAt,
  currency,
  metadata,
  provider,
  providerPaymentReference,
  userId
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  amountMinor: number;
  bookingId: string;
  checkoutReference: string;
  completedAt: string;
  currency: SupportedCurrency;
  metadata: Record<string, unknown>;
  provider: StoredPaymentProvider;
  providerPaymentReference: string;
  userId: string;
}) {
  const checkoutLookup = await admin
    .from("checkout_sessions")
    .select("id")
    .eq("provider_session_id", checkoutReference)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();
  const checkoutSessionId =
    ((checkoutLookup.data as {id: string} | null) ?? null)?.id ?? null;

  const paymentWrite = await admin
    .from("payments")
    .upsert(
      {
        amount_authorized_minor: amountMinor,
        amount_captured_minor: amountMinor,
        amount_refunded_minor: 0,
        booking_id: bookingId,
        checkout_session_id: checkoutSessionId,
        currency_code: currency,
        metadata: {
          ...metadata,
          checkoutReference,
          provider
        } as Json,
        paid_at: completedAt,
        provider,
        provider_fee_minor: 0,
        provider_payment_reference: providerPaymentReference,
        status: "paid",
        user_id: userId
      },
      {
        onConflict: "provider_payment_reference"
      }
    )
    .select("id")
    .single();

  if (paymentWrite.error || !paymentWrite.data?.id) {
    throw new Error(paymentWrite.error?.message ?? "Unable to record the payment.");
  }

  const checkoutUpdate = await admin
    .from("checkout_sessions")
    .update({
      completed_at: completedAt,
      status: "paid"
    })
    .eq("provider_session_id", checkoutReference)
    .eq("booking_id", bookingId)
    .eq("user_id", userId);

  if (checkoutUpdate.error) {
    throw new Error(checkoutUpdate.error.message);
  }

  const bookingUpdate = await admin
    .from("bookings")
    .update({
      confirmed_at: completedAt,
      payment_status: "paid",
      status: "confirmed"
    })
    .eq("id", bookingId)
    .eq("customer_user_id", userId);

  if (bookingUpdate.error) {
    throw new Error(bookingUpdate.error.message);
  }

  const itemsUpdate = await admin
    .from("booking_items")
    .update({
      confirmed_at: completedAt,
      status: "confirmed"
    })
    .eq("booking_id", bookingId);

  if (itemsUpdate.error) {
    throw new Error(itemsUpdate.error.message);
  }

  return (paymentWrite.data as {id: string}).id;
}

export async function finalizeSuccessfulProviderCheckoutPayment({
  amountMinor,
  bookingId,
  checkoutReference,
  metadata,
  paymentMethodLabel,
  provider,
  providerPaymentReference,
  userId
}: {
  amountMinor: number;
  bookingId: string;
  checkoutReference: string;
  metadata: Record<string, unknown>;
  paymentMethodLabel: string;
  provider: StoredPaymentProvider;
  providerPaymentReference: string;
  userId: string;
}) {
  const summary = await getBookingPaymentSummaryById(bookingId);

  if (!summary) {
    throw new Error("The booking linked to the payment could not be found.");
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
      checkoutReference,
      provider
    } as Json,
    p_provider: provider,
    p_provider_payment_reference: providerPaymentReference,
    p_provider_session_id: checkoutReference,
    p_user_id: userId
  });

  const paymentId =
    paymentFinalize.error || !paymentFinalize.data
      ? await finalizePaymentDirectly({
          admin,
          amountMinor,
          bookingId,
          checkoutReference,
          completedAt: now,
          currency: summary.currency,
          metadata,
          provider,
          providerPaymentReference,
          userId
        })
      : paymentFinalize.data as string;
  const invoice = await createOrGetPaidInvoiceForBooking(bookingId);

  await createFinanceAuditLog({
    action: "finance.payment.captured",
    entityId: paymentId,
    entityType: "payment",
    metadata: {
      bookingId,
      checkoutReference,
      invoiceId: invoice.invoiceId,
      provider
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
      paymentMethod: paymentMethodLabel,
      to: summary.customerEmail
    });
    await createFinanceAuditLog({
      action: "finance.email.payment_receipt_sent",
      entityId: invoice.invoiceId,
      entityType: "invoice",
      metadata: {
        bookingId,
        provider
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
      provider
    },
    targetUserId: userId
  });
}
