import "server-only";

import {type Locale} from "@/lib/i18n/routing";
import {type Money} from "@/lib/money";

import {sendEmail} from "./send-email";

export async function sendBookingConfirmationEmail({
  bookingReference,
  bookingTitle,
  detailLines,
  locale,
  passengerNames,
  supportHref,
  ticketHref,
  to,
  totalAmount
}: {
  bookingReference: string;
  bookingTitle: string;
  detailLines: readonly string[];
  locale: Locale;
  passengerNames: readonly string[];
  supportHref: string;
  ticketHref: string;
  to: string;
  totalAmount: Money;
}) {
  return sendEmail({
    data: {
      bookingReference,
      bookingTitle,
      detailLines,
      locale,
      passengerNames,
      supportHref,
      ticketHref,
      totalAmount
    },
    template: "booking_confirmation",
    to
  });
}

export async function sendBookingCancellationEmail({
  bookingReference,
  locale,
  refundAmount,
  refundTimeline,
  supportHref,
  to
}: {
  bookingReference: string;
  locale: Locale;
  refundAmount: Money | null;
  refundTimeline: string;
  supportHref: string;
  to: string;
}) {
  return sendEmail({
    data: {
      bookingReference,
      locale,
      refundAmount,
      refundTimeline,
      supportHref
    },
    template: "booking_cancellation",
    to
  });
}

export async function sendPaymentReceiptEmail({
  amountPaid,
  bookingReference,
  invoiceNumber,
  locale,
  paidAt,
  paymentMethod,
  to
}: {
  amountPaid: Money;
  bookingReference: string;
  invoiceNumber: string;
  locale: Locale;
  paidAt: string;
  paymentMethod: string;
  to: string;
}) {
  return sendEmail({
    data: {
      amountPaid,
      bookingReference,
      invoiceNumber,
      locale,
      paidAt,
      paymentMethod
    },
    template: "payment_receipt",
    to
  });
}

export async function sendVisaStatusUpdateEmail({
  applicationReference,
  explanation,
  locale,
  nextSteps,
  requiredDocuments,
  statusLabel,
  to
}: {
  applicationReference: string;
  explanation: string;
  locale: Locale;
  nextSteps: readonly string[];
  requiredDocuments: readonly string[];
  statusLabel: string;
  to: string;
}) {
  return sendEmail({
    data: {
      applicationReference,
      explanation,
      locale,
      nextSteps,
      requiredDocuments,
      statusLabel
    },
    template: "visa_status_update",
    to
  });
}

export async function sendWelcomeEmail({
  firstName,
  locale,
  quickLinks,
  to
}: {
  firstName: string | null;
  locale: Locale;
  quickLinks: {
    dashboard: string;
    flights: string;
    hotels: string;
  };
  to: string;
}) {
  return sendEmail({
    data: {
      firstName,
      locale,
      quickLinks
    },
    template: "welcome",
    to
  });
}
