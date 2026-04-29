import "server-only";

import {PDFDocument, PDFPage, StandardFonts, rgb} from "pdf-lib";

import {formatDate} from "@/lib/dates";
import {formatMoney} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";

import {type AureviaCompanyProfile} from "./company";
import {type BookingTaxLine, type PaymentBookingSummary} from "./types";

type InvoicePdfInput = {
  company: AureviaCompanyProfile;
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: string;
  locale: Locale;
  taxLines: BookingTaxLine[];
  booking: PaymentBookingSummary;
};

const labels = {
  de: {
    bookingReference: "Buchungsreferenz",
    customer: "Kunde",
    date: "Datum",
    description: "Leistung",
    dueNotice: "Zahlungsstatus: bezahlt",
    invoice: "Rechnung",
    invoiceNumber: "Rechnungsnummer",
    issuer: "Aussteller",
    quantity: "Menge",
    subtotal: "Zwischensumme",
    tax: "Steuern",
    total: "Gesamt",
    unitPrice: "Einzelpreis",
    vatId: "USt-IdNr.",
    taxReview: "Steuerlogik im Code erfordert vor Produktivbetrieb fachliche Pruefung."
  },
  en: {
    bookingReference: "Booking reference",
    customer: "Customer",
    date: "Date",
    description: "Service",
    dueNotice: "Payment status: paid",
    invoice: "Invoice",
    invoiceNumber: "Invoice number",
    issuer: "Issuer",
    quantity: "Qty",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    unitPrice: "Unit price",
    vatId: "VAT ID",
    taxReview: "Tax logic in code still requires qualified accountant review before production."
  }
} as const;

function drawLine(page: PDFPage, y: number) {
  page.drawLine({
    color: rgb(0.84, 0.84, 0.88),
    end: {x: 555, y},
    start: {x: 40, y},
    thickness: 1
  });
}

export async function renderInvoicePdf({
  booking,
  company,
  invoiceNumber,
  issuedAt,
  locale,
  taxLines
}: InvoicePdfInput) {
  const copy = labels[locale];
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;

  page.drawText(company.name, {
    color: rgb(0.12, 0.2, 0.36),
    font: boldFont,
    size: 24,
    x: 40,
    y
  });
  y -= 30;
  page.drawText(`${copy.invoice} | ${invoiceNumber}`, {
    color: rgb(0.18, 0.18, 0.24),
    font: boldFont,
    size: 16,
    x: 40,
    y
  });
  y -= 24;
  page.drawText(`${copy.date}: ${formatDate(issuedAt, locale)}`, {
    font: regularFont,
    size: 10,
    x: 40,
    y
  });
  page.drawText(copy.dueNotice, {
    font: regularFont,
    size: 10,
    x: 360,
    y
  });
  y -= 24;
  drawLine(page, y);
  y -= 20;

  page.drawText(copy.issuer, {
    font: boldFont,
    size: 11,
    x: 40,
    y
  });
  page.drawText(copy.customer, {
    font: boldFont,
    size: 11,
    x: 310,
    y
  });
  y -= 18;

  for (const line of [
    company.name,
    company.address,
    company.email,
    `${copy.vatId}: ${company.vatId}`
  ]) {
    page.drawText(line, {
      font: regularFont,
      size: 10,
      x: 40,
      y
    });
    y -= 14;
  }

  for (const line of [
    booking.customerEmail,
    booking.customerPhone ?? "",
    `${copy.bookingReference}: ${booking.bookingReference}`
  ].filter(Boolean)) {
    page.drawText(line, {
      font: regularFont,
      size: 10,
      x: 310,
      y: y + 42
    });
    y -= 14;
  }

  y -= 12;
  drawLine(page, y);
  y -= 22;

  page.drawText(copy.description, {font: boldFont, size: 10, x: 40, y});
  page.drawText(copy.quantity, {font: boldFont, size: 10, x: 315, y});
  page.drawText(copy.unitPrice, {font: boldFont, size: 10, x: 390, y});
  page.drawText(copy.total, {font: boldFont, size: 10, x: 490, y});
  y -= 16;

  for (const item of booking.items) {
    const unitAmountMinor = Math.round(item.totalAmountMinor / Math.max(1, item.quantity));
    const lineLabel = item.description ? `${item.title} | ${item.description}` : item.title;

    page.drawText(lineLabel.slice(0, 46), {
      font: regularFont,
      size: 10,
      x: 40,
      y
    });
    page.drawText(String(item.quantity), {
      font: regularFont,
      size: 10,
      x: 325,
      y
    });
    page.drawText(
      formatMoney(
        {
          amountMinor: unitAmountMinor,
          currency: booking.currency
        },
        locale
      ),
      {
        font: regularFont,
        size: 10,
        x: 390,
        y
      }
    );
    page.drawText(
      formatMoney(
        {
          amountMinor: item.totalAmountMinor,
          currency: booking.currency
        },
        locale
      ),
      {
        font: regularFont,
        size: 10,
        x: 490,
        y
      }
    );
    y -= 18;
  }

  y -= 10;
  drawLine(page, y);
  y -= 24;

  const summaryXLabel = 380;
  const summaryXValue = 490;
  const summaryRows = [
    [copy.subtotal, booking.subtotalAmountMinor],
    [copy.tax, booking.taxAmountMinor],
    [copy.total, booking.totalAmountMinor]
  ] as const;

  for (const [label, amountMinor] of summaryRows) {
    page.drawText(label, {
      font: label === copy.total ? boldFont : regularFont,
      size: label === copy.total ? 11 : 10,
      x: summaryXLabel,
      y
    });
    page.drawText(
      formatMoney(
        {
          amountMinor,
          currency: booking.currency
        },
        locale
      ),
      {
        font: label === copy.total ? boldFont : regularFont,
        size: label === copy.total ? 11 : 10,
        x: summaryXValue,
        y
      }
    );
    y -= 18;
  }

  if (taxLines.length > 0) {
    y -= 10;
    page.drawText(copy.tax, {
      font: boldFont,
      size: 11,
      x: 40,
      y
    });
    y -= 18;

    for (const line of taxLines) {
      const body = `${line.taxName} | ${Math.round(line.rate * 100)}% | ${formatMoney(
        {
          amountMinor: line.taxAmountMinor,
          currency: line.currency
        },
        locale
      )}`;

      page.drawText(body, {
        font: regularFont,
        size: 10,
        x: 40,
        y
      });
      y -= 14;
    }
  }

  page.drawText(copy.taxReview, {
    color: rgb(0.42, 0.42, 0.5),
    font: regularFont,
    size: 9,
    x: 40,
    y: 50
  });

  return pdf.save();
}
