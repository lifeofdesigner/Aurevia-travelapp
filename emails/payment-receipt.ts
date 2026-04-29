import {type Locale} from "@/lib/i18n/routing";
import {formatMoney, type Money} from "@/lib/money";

import {buildEmailShell, getEmailBrandName} from "./shared";

type PaymentReceiptEmailInput = {
  amountPaid: Money;
  bookingReference: string;
  footerText: string;
  invoiceNumber: string;
  locale: Locale;
  paidAt: string;
  paymentMethod: string;
};

export function buildPaymentReceiptEmail({
  amountPaid,
  bookingReference,
  footerText,
  invoiceNumber,
  locale,
  paidAt,
  paymentMethod
}: PaymentReceiptEmailInput) {
  const total = formatMoney(amountPaid, locale);
  const brandName = getEmailBrandName(footerText);
  const title = locale === "de" ? "Zahlung eingegangen" : "Payment Received";
  const subject = locale === "de"
    ? `${brandName} Zahlungsbeleg | ${invoiceNumber}`
    : `${brandName} Payment Receipt | ${invoiceNumber}`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de"
        ? "Vielen Dank. Wir haben Ihre Zahlung erfolgreich erfasst."
        : "Thank you. We have successfully captured your payment."}
    </p>
    <div style="border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#f7f3ec;">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Amount Paid</p>
      <p style="margin:10px 0 0;font-size:24px;font-weight:700;color:#1c3d2e;">${total}</p>
    </div>
    <div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:14px;line-height:1.8;color:#56705f;">Booking reference: <strong>${bookingReference}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Invoice number: <strong>${invoiceNumber}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Payment method: <strong>${paymentMethod}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Payment date: <strong>${paidAt}</strong></p>
    </div>
  `;

  return {
    html: buildEmailShell({
      bodyHtml,
      footerText,
      title
    }),
    subject,
    text: `${title}\nBooking reference: ${bookingReference}\nInvoice number: ${invoiceNumber}\nPayment method: ${paymentMethod}\nPayment date: ${paidAt}\nAmount paid: ${total}`
  };
}
