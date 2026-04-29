import {type Locale} from "@/lib/i18n/routing";
import {formatMoney, type Money} from "@/lib/money";

import {buildEmailShell, getEmailBrandName} from "./shared";

type BookingCancellationEmailInput = {
  bookingReference: string;
  footerText: string;
  locale: Locale;
  refundAmount: Money | null;
  refundTimeline: string;
  supportHref: string;
};

export function buildBookingCancellationEmail({
  bookingReference,
  footerText,
  locale,
  refundAmount,
  refundTimeline,
  supportHref
}: BookingCancellationEmailInput) {
  const brandName = getEmailBrandName(footerText);
  const title = locale === "de" ? "Buchung storniert" : "Booking Cancelled";
  const subject = locale === "de"
    ? `${brandName} Buchungsstornierung | ${bookingReference}`
    : `${brandName} Booking Cancelled | ${bookingReference}`;
  const refundLabel = refundAmount ? formatMoney(refundAmount, locale) : (locale === "de" ? "Wird geprueft" : "Pending review");

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de"
        ? "Ihre Buchung wurde storniert. Nachfolgend finden Sie den aktuellen Rueckerstattungsstatus."
        : "Your booking has been cancelled. Below is the current refund status for this booking."}
    </p>
    <div style="border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:14px;line-height:1.8;color:#56705f;">Booking reference: <strong>${bookingReference}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Refund amount: <strong>${refundLabel}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Refund timeline: <strong>${refundTimeline}</strong></p>
    </div>
    <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#56705f;">
      <a href="${supportHref}" style="color:#1c3d2e;">${locale === "de" ? "Support kontaktieren" : "Contact support"}</a>
    </p>
  `;

  return {
    html: buildEmailShell({
      bodyHtml,
      footerText,
      title
    }),
    subject,
    text: `${title}\nBooking reference: ${bookingReference}\nRefund amount: ${refundLabel}\nRefund timeline: ${refundTimeline}\nSupport: ${supportHref}`
  };
}
