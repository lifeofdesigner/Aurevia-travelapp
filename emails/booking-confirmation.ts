import {type Locale} from "@/lib/i18n/routing";
import {formatMoney, type Money} from "@/lib/money";

import {buildEmailShell, getEmailBrandName} from "./shared";

type BookingConfirmationEmailInput = {
  bookingReference: string;
  bookingTitle: string;
  detailLines: readonly string[];
  footerText: string;
  locale: Locale;
  passengerNames: readonly string[];
  supportHref: string;
  ticketHref: string;
  totalAmount: Money;
};

export function buildBookingConfirmationEmail({
  bookingReference,
  bookingTitle,
  detailLines,
  footerText,
  locale,
  passengerNames,
  supportHref,
  ticketHref,
  totalAmount
}: BookingConfirmationEmailInput) {
  const total = formatMoney(totalAmount, locale);
  const brandName = getEmailBrandName(footerText);
  const title = locale === "de" ? "Buchung bestaetigt" : "Booking Confirmed";
  const subject = locale === "de"
    ? `${brandName} Buchungsbestaetigung | ${bookingReference}`
    : `${brandName} Booking Confirmed | ${bookingReference}`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de"
        ? `Ihre Reise wurde bestaetigt und ist jetzt in Ihrem ${brandName}-Konto verfuegbar.`
        : `Your trip has been confirmed and is now available in your ${brandName} account.`}
    </p>
    <div style="border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#f7f3ec;">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Booking Reference</p>
      <p style="margin:10px 0 0;font-size:24px;font-weight:700;color:#1c3d2e;">${bookingReference}</p>
    </div>
    <div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-weight:700;color:#1c3d2e;">${bookingTitle}</p>
      ${detailLines.map((line) => `<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#56705f;">${line}</p>`).join("")}
    </div>
    <div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Passengers</p>
      ${passengerNames.length > 0
        ? passengerNames.map((name) => `<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#56705f;">${name}</p>`).join("")
        : `<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#56705f;">${locale === "de" ? "Passagierdetails im Kundenbereich verfuegbar." : "Passenger details are available in your account area."}</p>`}
    </div>
    <div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Total Paid</p>
      <p style="margin:10px 0 0;font-size:22px;font-weight:700;color:#1c3d2e;">${total}</p>
    </div>
    <div style="margin-top:24px;">
      <a href="${ticketHref}" style="display:inline-block;background:#c9a84c;color:#1c3d2e;text-decoration:none;padding:12px 18px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
        Download E-ticket
      </a>
    </div>
    <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de" ? "Brauchen Sie Hilfe?" : "Need help?"}
      <a href="${supportHref}" style="color:#1c3d2e;">${locale === "de" ? "Support kontaktieren" : "Contact support"}</a>
    </p>
  `;

  const text = [
    title,
    `Reference: ${bookingReference}`,
    bookingTitle,
    ...detailLines,
    passengerNames.length > 0 ? `Passengers: ${passengerNames.join(", ")}` : "Passengers: See account area",
    `Total paid: ${total}`,
    `E-ticket: ${ticketHref}`,
    `Support: ${supportHref}`
  ].join("\n");

  return {
    html: buildEmailShell({
      bodyHtml,
      footerText,
      title
    }),
    subject,
    text
  };
}
