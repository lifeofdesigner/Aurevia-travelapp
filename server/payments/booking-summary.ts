import "server-only";

import {type SupportedCurrency} from "@/lib/money";
import {
  type BookingStatus,
  type BookingType,
  type InvoiceStatus,
  type LocaleCode,
  type PaymentStatus
} from "@/types/database-enums";
import {type Json} from "@/types/supabase";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {
  type InvoiceDocumentSummary,
  type PaymentBookingSummary,
  type PaymentReceiptSummary
} from "./types";

type BookingRow = {
  billing_address_snapshot: Json;
  booking_reference: string;
  created_at: string;
  currency_code: SupportedCurrency;
  customer_email: string;
  customer_phone: string | null;
  customer_user_id: string;
  discount_amount_minor: number;
  expires_at: string | null;
  id: string;
  locale: LocaleCode;
  metadata: Json;
  payment_status: PaymentStatus;
  primary_booking_type: BookingType;
  status: BookingStatus;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  total_amount_minor: number;
  traveler_summary: Json;
};

type BookingItemRow = {
  booking_type: BookingType;
  currency_code: SupportedCurrency;
  description: string | null;
  id: string;
  quantity: number;
  service_end_at: string | null;
  service_start_at: string | null;
  snapshot_payload: Json;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  title: string;
  total_amount_minor: number;
};

type InvoiceRow = {
  booking_id: string;
  currency_code: SupportedCurrency;
  id: string;
  invoice_number: string;
  issued_at: string | null;
  pdf_upload_id: string | null;
  status: InvoiceStatus;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  total_amount_minor: number;
};

type PaymentRow = {
  amount_captured_minor: number;
  amount_refunded_minor: number;
  booking_id: string;
  currency_code: SupportedCurrency;
  id: string;
  provider_payment_reference: string | null;
  status: PaymentStatus;
};

function asRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: Json): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => asRecord(entry));
}

async function getBookingPaymentSummary(
  bookingId: string,
  userId?: string
): Promise<PaymentBookingSummary | null> {
  const admin = createSupabaseAdminClient();
  let bookingQuery = admin
    .from("bookings")
    .select(
      "id, booking_reference, created_at, currency_code, customer_email, customer_phone, customer_user_id, locale, status, payment_status, primary_booking_type, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, total_amount_minor, billing_address_snapshot, traveler_summary, metadata, expires_at"
    )
    .eq("id", bookingId)
    .is("deleted_at", null);

  if (userId) {
    bookingQuery = bookingQuery.eq("customer_user_id", userId);
  }

  const bookingResult = await bookingQuery.maybeSingle();
  const booking = (bookingResult.data as BookingRow | null) ?? null;

  if (!booking) {
    return null;
  }

  const [itemsResult, invoiceResult] = await Promise.all([
    admin
      .from("booking_items")
      .select(
        "id, booking_type, title, description, quantity, service_start_at, service_end_at, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code, snapshot_payload"
      )
      .eq("booking_id", booking.id)
      .order("position", {ascending: true}),
    admin
      .from("invoices")
      .select(
        "id, invoice_number, status, pdf_upload_id, issued_at, booking_id, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code"
      )
      .eq("booking_id", booking.id)
      .order("created_at", {ascending: false})
      .limit(1)
      .maybeSingle()
  ]);

  const items = ((itemsResult.data as BookingItemRow[] | null) ?? []).map((item) => ({
    bookingItemId: item.id,
    bookingType: item.booking_type,
    currencyCode: item.currency_code,
    description: item.description,
    quantity: item.quantity,
    serviceEndAt: item.service_end_at,
    serviceStartAt: item.service_start_at,
    snapshotPayload: asRecord(item.snapshot_payload),
    subtotalAmountMinor: item.subtotal_amount_minor,
    taxAmountMinor: item.tax_amount_minor,
    title: item.title,
    totalAmountMinor: item.total_amount_minor
  }));
  const invoice = (invoiceResult.data as InvoiceRow | null) ?? null;

  return {
    billingAddressSnapshot: asRecord(booking.billing_address_snapshot),
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    createdAt: booking.created_at,
    currency: booking.currency_code,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    customerUserId: booking.customer_user_id,
    discountAmountMinor: booking.discount_amount_minor,
    expiresAt: booking.expires_at,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice?.invoice_number ?? null,
    invoicePdfUploadId: invoice?.pdf_upload_id ?? null,
    invoiceStatus: invoice?.status ?? null,
    items,
    locale: booking.locale,
    metadata: asRecord(booking.metadata),
    paymentStatus: booking.payment_status,
    primaryBookingType: booking.primary_booking_type,
    status: booking.status,
    subtotalAmountMinor: booking.subtotal_amount_minor,
    taxAmountMinor: booking.tax_amount_minor,
    totalAmountMinor: booking.total_amount_minor,
    travelerSummary: asRecordArray(booking.traveler_summary)
  };
}

export async function getBookingPaymentSummaryById(bookingId: string) {
  return getBookingPaymentSummary(bookingId);
}

export async function getOwnedBookingPaymentSummary(
  bookingId: string,
  userId: string
): Promise<PaymentBookingSummary | null> {
  return getBookingPaymentSummary(bookingId, userId);
}

export async function getOwnedPaymentReceiptSummary(
  bookingId: string,
  userId: string
): Promise<PaymentReceiptSummary | null> {
  const summary = await getOwnedBookingPaymentSummary(bookingId, userId);

  if (!summary) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const paymentResult = await admin
    .from("payments")
    .select(
      "id, booking_id, status, amount_captured_minor, amount_refunded_minor, currency_code, provider_payment_reference"
    )
    .eq("booking_id", summary.bookingId)
    .eq("user_id", userId)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const payment = (paymentResult.data as PaymentRow | null) ?? null;

  if (!payment) {
    return null;
  }

  return {
    amountCaptured: {
      amountMinor: payment.amount_captured_minor,
      currency: payment.currency_code
    },
    amountRefunded: {
      amountMinor: payment.amount_refunded_minor,
      currency: payment.currency_code
    },
    bookingId: summary.bookingId,
    bookingReference: summary.bookingReference,
    currency: payment.currency_code,
    invoiceId: summary.invoiceId,
    invoiceNumber: summary.invoiceNumber,
    paymentId: payment.id,
    paymentStatus: payment.status,
    providerPaymentReference: payment.provider_payment_reference
  };
}

export async function getOwnedInvoiceDocumentSummary(
  invoiceId: string,
  userId: string
): Promise<InvoiceDocumentSummary | null> {
  const admin = createSupabaseAdminClient();
  const invoiceResult = await admin
    .from("invoices")
    .select(
      "id, booking_id, invoice_number, status, pdf_upload_id, issued_at, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code"
    )
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  const invoice = (invoiceResult.data as InvoiceRow | null) ?? null;

  if (!invoice) {
    return null;
  }

  const bookingResult = await admin
    .from("bookings")
    .select("booking_reference")
    .eq("id", invoice.booking_id)
    .eq("customer_user_id", userId)
    .maybeSingle();
  const bookingReference =
    ((bookingResult.data as {booking_reference: string} | null) ?? null)?.booking_reference ??
    null;

  if (!bookingReference) {
    return null;
  }

  return {
    bookingId: invoice.booking_id,
    bookingReference,
    currency: invoice.currency_code,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    issuedAt: invoice.issued_at,
    pdfUploadId: invoice.pdf_upload_id,
    status: invoice.status,
    subtotalAmountMinor: invoice.subtotal_amount_minor,
    taxAmountMinor: invoice.tax_amount_minor,
    totalAmountMinor: invoice.total_amount_minor
  };
}
