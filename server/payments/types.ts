import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";
import type {
  BookingStatus,
  BookingType,
  InvoiceStatus,
  PaymentStatus
} from "@/types/database-enums";

export type PaymentBookingItemSummary = {
  bookingItemId: string;
  bookingType: BookingType;
  currencyCode: SupportedCurrency;
  description: string | null;
  quantity: number;
  serviceEndAt: string | null;
  serviceStartAt: string | null;
  snapshotPayload: Record<string, unknown>;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  title: string;
  totalAmountMinor: number;
};

export type PaymentBookingSummary = {
  billingAddressSnapshot: Record<string, unknown>;
  bookingId: string;
  bookingReference: string;
  createdAt: string;
  currency: SupportedCurrency;
  customerEmail: string;
  customerPhone: string | null;
  customerUserId: string;
  discountAmountMinor: number;
  expiresAt: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoicePdfUploadId: string | null;
  invoiceStatus: InvoiceStatus | null;
  items: PaymentBookingItemSummary[];
  locale: Locale;
  metadata: Record<string, unknown>;
  paymentStatus: PaymentStatus;
  primaryBookingType: BookingType;
  status: BookingStatus;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
  travelerSummary: Record<string, unknown>[];
};

export type CheckoutSessionLaunch = {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

export type BookingTaxLine = {
  bookingItemId: string | null;
  currency: SupportedCurrency;
  jurisdictionCountryCode: string;
  rate: number;
  taxAmountMinor: number;
  taxName: string;
  taxableAmountMinor: number;
};

export type InvoiceDocumentSummary = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: string | null;
  pdfUploadId: string | null;
  status: InvoiceStatus;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
};

export type PaymentReceiptSummary = {
  amountCaptured: Money;
  amountRefunded: Money;
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  invoiceId: string | null;
  invoiceNumber: string | null;
  paymentId: string;
  paymentStatus: PaymentStatus;
  providerPaymentReference: string | null;
};
