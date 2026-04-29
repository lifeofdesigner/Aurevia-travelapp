import "server-only";

import {createHash} from "crypto";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {createFinanceAuditLog} from "@/server/payments/audit";
import {getOwnedBookingPaymentSummary} from "@/server/payments/booking-summary";
import {
  getPaymentSettingsForCheckout,
  requireEnabledPaymentMethod
} from "@/server/payments/payment-methods";
import {finalizeSuccessfulProviderCheckoutPayment} from "@/server/payments/provider-finalization";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {type CheckoutSessionLaunch, type PaymentBookingSummary} from "./types";

type BankTransferCheckoutRow = {
  amount_total_minor: number;
  booking_id: string;
  currency_code: string;
  expires_at: string;
  metadata: Json;
  provider_session_id: string | null;
  status: string;
  user_id: string;
};

const BANK_TRANSFER_STORAGE_PROVIDER = "manual";

function buildAppUrl(path: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return new URL(path, appUrl).toString();
}

function createBankTransferReference(bookingId: string) {
  return `bt-${bookingId.replaceAll("-", "")}-${Date.now()}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getBankTransferUrl(locale: Locale, reference: string) {
  return buildAppUrl(
    `/${locale}/payments/bank-transfer?session_id=${encodeURIComponent(reference)}`
  );
}

function assertPayableSummary(summary: PaymentBookingSummary) {
  if (summary.status !== "pending_payment") {
    throw new Error("Only pending-payment bookings can use bank transfer.");
  }

  if (summary.paymentStatus === "paid" || summary.paymentStatus === "authorized") {
    throw new Error("This booking has already been paid.");
  }
}

export async function initializeBankTransferForOwnedBooking({
  bookingId,
  userId
}: {
  bookingId: string;
  userId: string;
}): Promise<CheckoutSessionLaunch> {
  await requireEnabledPaymentMethod("bank_transfer");

  const [settings, summary] = await Promise.all([
    getPaymentSettingsForCheckout(),
    getOwnedBookingPaymentSummary(bookingId, userId)
  ]);

  if (!summary) {
    throw new Error("The selected booking could not be found.");
  }

  assertPayableSummary(summary);

  const bankTransferDetails = settings.bankTransferDetails.trim();

  if (!bankTransferDetails) {
    throw new Error("Bank transfer details have not been configured.");
  }

  const admin = createSupabaseAdminClient();
  const existingSessionResult = await admin
    .from("checkout_sessions")
    .select("provider_session_id, expires_at, status")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .eq("provider", BANK_TRANSFER_STORAGE_PROVIDER)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingSession =
    (existingSessionResult.data as
      | {expires_at: string; provider_session_id: string | null; status: string}
      | null) ?? null;

  if (
    existingSession?.provider_session_id &&
    ["pending", "requires_action"].includes(existingSession.status)
  ) {
    return {
      checkoutSessionId: existingSession.provider_session_id,
      checkoutUrl: getBankTransferUrl(summary.locale, existingSession.provider_session_id),
      expiresAt: existingSession.expires_at
    };
  }

  const reference = createBankTransferReference(bookingId);
  const expiresAt =
    summary.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const successUrl = getBankTransferUrl(summary.locale, reference);
  const cancelUrl = buildAppUrl(`/${summary.locale}/payments/cancel?bookingId=${bookingId}`);
  const idempotencyKey = createHash("sha256").update(reference).digest("hex");
  const checkoutWrite = await admin.from("checkout_sessions").insert({
    amount_total_minor: summary.totalAmountMinor,
    booking_id: summary.bookingId,
    cancel_url: cancelUrl,
    completed_at: null,
    currency_code: summary.currency,
    expires_at: expiresAt,
    idempotency_key: idempotencyKey,
    metadata: {
      bankTransferDetails,
      bookingReference: summary.bookingReference,
      paymentMethod: "bank_transfer"
    },
    provider: BANK_TRANSFER_STORAGE_PROVIDER,
    provider_session_id: reference,
    status: "requires_action",
    success_url: successUrl,
    user_id: userId
  });

  if (checkoutWrite.error) {
    throw new Error(checkoutWrite.error.message);
  }

  const paymentWrite = await admin.from("payments").upsert(
    {
      amount_authorized_minor: summary.totalAmountMinor,
      amount_captured_minor: 0,
      amount_refunded_minor: 0,
      booking_id: summary.bookingId,
      currency_code: summary.currency,
      metadata: {
        bankTransferDetails,
        bookingReference: summary.bookingReference,
        paymentMethod: "bank_transfer"
      },
      provider: BANK_TRANSFER_STORAGE_PROVIDER,
      provider_fee_minor: 0,
      provider_payment_reference: reference,
      status: "requires_action",
      user_id: userId
    },
    {
      onConflict: "provider_payment_reference"
    }
  );

  if (paymentWrite.error) {
    throw new Error(paymentWrite.error.message);
  }

  const bookingWrite = await admin
    .from("bookings")
    .update({
      payment_status: "requires_action"
    })
    .eq("id", summary.bookingId)
    .eq("customer_user_id", userId);

  if (bookingWrite.error) {
    throw new Error(bookingWrite.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.bank_transfer.instructions_created",
    entityId: summary.bookingId,
    entityType: "booking",
    metadata: {
      checkoutReference: reference,
      provider: "bank_transfer",
      storageProvider: BANK_TRANSFER_STORAGE_PROVIDER
    },
    targetUserId: userId
  });

  return {
    checkoutSessionId: reference,
    checkoutUrl: successUrl,
    expiresAt
  };
}

export async function getOwnedBankTransferInstructions({
  providerSessionId,
  userId
}: {
  providerSessionId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, currency_code, expires_at, metadata, provider_session_id, status, user_id")
    .eq("provider", BANK_TRANSFER_STORAGE_PROVIDER)
    .eq("provider_session_id", providerSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const checkout = (checkoutResult.data as BankTransferCheckoutRow | null) ?? null;

  if (!checkout) {
    return null;
  }

  const booking = await getOwnedBookingPaymentSummary(checkout.booking_id, userId);

  if (!booking) {
    return null;
  }

  const metadata = asRecord(checkout.metadata);
  const settings = await getPaymentSettingsForCheckout();
  const bankTransferDetails =
    typeof metadata.bankTransferDetails === "string" && metadata.bankTransferDetails.trim()
      ? metadata.bankTransferDetails
      : settings.bankTransferDetails;

  return {
    bankTransferDetails,
    booking,
    checkout: {
      expiresAt: checkout.expires_at,
      reference: providerSessionId,
      status: checkout.status
    }
  };
}

export async function confirmBankTransferPaymentForBooking({
  actorUserId,
  bookingId
}: {
  actorUserId: string;
  bookingId: string;
}) {
  const admin = createSupabaseAdminClient();
  const checkoutResult = await admin
    .from("checkout_sessions")
    .select("amount_total_minor, booking_id, provider_session_id, status, user_id")
    .eq("provider", BANK_TRANSFER_STORAGE_PROVIDER)
    .eq("booking_id", bookingId)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const checkout =
    (checkoutResult.data as
      | {
          amount_total_minor: number;
          booking_id: string;
          provider_session_id: string | null;
          status: string;
          user_id: string;
        }
      | null) ?? null;

  if (!checkout?.provider_session_id) {
    throw new Error("No bank transfer checkout session is available for this booking.");
  }

  if (checkout.status === "paid") {
    throw new Error("This bank transfer has already been confirmed.");
  }

  await finalizeSuccessfulProviderCheckoutPayment({
    amountMinor: checkout.amount_total_minor,
    bookingId: checkout.booking_id,
    checkoutReference: checkout.provider_session_id,
    metadata: {
      confirmedByAdminUserId: actorUserId
    },
    paymentMethodLabel: "Bank transfer",
    provider: BANK_TRANSFER_STORAGE_PROVIDER,
    providerPaymentReference: checkout.provider_session_id,
    userId: checkout.user_id
  });
}
