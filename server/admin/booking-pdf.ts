import "server-only";

import {PDFDocument, PDFImage, PDFPage, PDFFont, StandardFonts, rgb} from "pdf-lib";

import {formatDateTime} from "@/lib/dates";
import {
  getAirlineBrandTheme,
  getPdfAirlineLogoUrl,
  isLikelyPdfRasterImageUrl,
  type AirlineBrandTheme
} from "@/lib/flights/airline-branding";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getSiteBranding} from "@/server/brand/site-branding";
import {type AdminBookingDetail} from "@/features/admin/types";

const pageWidth = 595.28;
const pageHeight = 841.89;
const colors = {
  accent: rgb(0.79, 0.66, 0.3),
  border: rgb(0.91, 0.88, 0.82),
  dark: rgb(0.07, 0.11, 0.08),
  foreground: rgb(0.11, 0.24, 0.18),
  ivory: rgb(0.96, 0.94, 0.91),
  muted: rgb(0.34, 0.44, 0.37),
  pale: rgb(0.97, 0.95, 0.91),
  white: rgb(1, 1, 1)
};

type PdfFonts = {
  bold: PDFFont;
  regular: PDFFont;
};

type AirlineBrandIdentity = {
  code: string;
  logoUrl: string | null;
  name: string;
  theme: AirlineBrandTheme;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => asRecord(entry)).filter((entry) => Object.keys(entry).length > 0);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  const safe = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const red = Number.parseInt(safe.slice(0, 2), 16) / 255;
  const green = Number.parseInt(safe.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(safe.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function extractFlightAirlineBrand(booking: AdminBookingDetail): AirlineBrandIdentity | null {
  const flightItem = booking.items.find((item) => item.bookingType === "flight");

  if (!flightItem) {
    return null;
  }

  const payload = asRecord(flightItem.snapshotPayload);
  const offer = asRecord(payload.offer);
  const metadata = asRecord(offer.metadata);
  const airlineLogoEntries = asRecordArray(metadata.airlineLogos);
  const offerOwner = asRecord(metadata.offerOwner);
  const legs = asRecordArray(offer.legs);
  const firstSegment = legs.flatMap((leg) => asRecordArray(leg.segments))[0];

  if (!firstSegment) {
    return null;
  }

  const code = asString(firstSegment.marketingAirlineCode).trim().toUpperCase();
  const fallbackName =
    asString(firstSegment.marketingAirlineName) ||
    asString(firstSegment.operatingAirlineName) ||
    code ||
    "Airline";
  const matchingEntry = [...airlineLogoEntries, offerOwner].find(
    (entry) => asString(entry.code).trim().toUpperCase() === code
  );
  const name = asString(matchingEntry?.name) || fallbackName;
  const resolvedCode = code || asString(matchingEntry?.code).trim().toUpperCase() || "AIR";

  return {
    code: resolvedCode,
    logoUrl: getPdfAirlineLogoUrl({
      code: resolvedCode,
      logoUrl: asString(matchingEntry?.logoUrl) || null
    }),
    name,
    theme: getAirlineBrandTheme({
      code: resolvedCode,
      name
    })
  };
}

async function embedRasterLogo(pdf: PDFDocument, logoUrl: string | null) {
  if (!logoUrl || !isLikelyPdfRasterImageUrl(logoUrl)) {
    return null;
  }

  try {
    const response = await fetch(logoUrl, {cache: "force-cache"});

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const imageBytes = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("png") || logoUrl?.toLowerCase().includes(".png")) {
      return pdf.embedPng(imageBytes);
    }

    if (
      contentType.includes("jpeg") ||
      contentType.includes("jpg") ||
      logoUrl?.toLowerCase().match(/\.jpe?g($|\?)/)
    ) {
      return pdf.embedJpg(imageBytes);
    }
  } catch {
    return null;
  }

  return null;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}...` : value;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function drawText(
  page: PDFPage,
  text: string,
  {
    color = colors.foreground,
    font,
    size = 10,
    x,
    y
  }: {
    color?: ReturnType<typeof rgb>;
    font: PDFFont;
    size?: number;
    x: number;
    y: number;
  }
) {
  page.drawText(text, {
    color,
    font,
    size,
    x,
    y
  });
}

function drawBox(
  page: PDFPage,
  {
    color = colors.white,
    height,
    x,
    y,
    width
  }: {
    color?: ReturnType<typeof rgb>;
    height: number;
    width: number;
    x: number;
    y: number;
  }
) {
  page.drawRectangle({
    borderColor: colors.border,
    borderWidth: 1,
    color,
    height,
    width,
    x,
    y
  });
}

function drawLabelValue(
  page: PDFPage,
  fonts: PdfFonts,
  {
    label,
    value,
    width = 180,
    x,
    y
  }: {
    label: string;
    value: string;
    width?: number;
    x: number;
    y: number;
  }
) {
  drawText(page, label.toUpperCase(), {
    color: colors.muted,
    font: fonts.bold,
    size: 7.5,
    x,
    y
  });
  drawText(page, truncate(value, Math.floor(width / 5.2)), {
    font: fonts.regular,
    size: 10,
    x,
    y: y - 15
  });
}

function drawMoneyRow(
  page: PDFPage,
  fonts: PdfFonts,
  {
    amountMinor,
    booking,
    isTotal = false,
    label,
    locale,
    y
  }: {
    amountMinor: number;
    booking: AdminBookingDetail;
    isTotal?: boolean;
    label: string;
    locale: Locale;
    y: number;
  }
) {
  drawText(page, label, {
    color: isTotal ? colors.foreground : colors.muted,
    font: isTotal ? fonts.bold : fonts.regular,
    size: isTotal ? 11 : 9.5,
    x: 365,
    y
  });
  drawText(page, formatMoney({amountMinor, currency: booking.currency}, locale), {
    font: isTotal ? fonts.bold : fonts.regular,
    size: isTotal ? 11 : 9.5,
    x: 470,
    y
  });
}

function drawHeader(
  page: PDFPage,
  fonts: PdfFonts,
  {
    airline,
    airlineLogo,
    booking,
    businessLocation,
    contactEmail,
    siteName
  }: {
    airline: AirlineBrandIdentity | null;
    airlineLogo: PDFImage | null;
    booking: AdminBookingDetail;
    businessLocation: string;
    contactEmail: string;
    siteName: string;
  }
) {
  const primaryColor = airline ? hexToRgb(airline.theme.primary) : colors.foreground;
  const accentColor = airline ? hexToRgb(airline.theme.accent) : colors.accent;

  page.drawRectangle({
    color: primaryColor,
    height: 150,
    width: pageWidth,
    x: 0,
    y: pageHeight - 150
  });
  page.drawRectangle({
    color: colors.dark,
    height: 150,
    opacity: 0.28,
    width: 190,
    x: pageWidth - 190,
    y: pageHeight - 150
  });

  drawText(page, "ADMIN TRAVEL DOCUMENT", {
    color: accentColor,
    font: fonts.bold,
    size: 8.5,
    x: 40,
    y: 790
  });
  drawText(page, siteName, {
    color: colors.white,
    font: fonts.bold,
    size: 21,
    x: 40,
    y: 768
  });
  drawText(page, `${businessLocation} | ${contactEmail}`, {
    color: colors.ivory,
    font: fonts.regular,
    size: 9,
    x: 40,
    y: 750
  });

  drawText(page, "Booking reference", {
    color: colors.ivory,
    font: fonts.bold,
    size: 8,
    x: 390,
    y: 790
  });
  drawText(page, booking.bookingReference, {
    color: colors.white,
    font: fonts.bold,
    size: 16,
    x: 390,
    y: 770
  });
  drawText(page, `Created ${formatDateTime(booking.createdAt, "en")}`, {
    color: colors.ivory,
    font: fonts.regular,
    size: 8.5,
    x: 390,
    y: 750
  });

  if (airline) {
    if (airlineLogo) {
      const dimensions = airlineLogo.scaleToFit(116, 38);
      page.drawRectangle({
        color: colors.white,
        height: 48,
        opacity: 0.96,
        width: 132,
        x: 40,
        y: 694
      });
      page.drawImage(airlineLogo, {
        height: dimensions.height,
        width: dimensions.width,
        x: 48,
        y: 699 + (38 - dimensions.height) / 2
      });
    } else {
      page.drawRectangle({
        color: accentColor,
        height: 38,
        width: 58,
        x: 40,
        y: 700
      });
      drawText(page, airline.code, {
        color: primaryColor,
        font: fonts.bold,
        size: 14,
        x: 52,
        y: 713
      });
    }

    drawText(page, "Selected airline", {
      color: colors.ivory,
      font: fonts.bold,
      size: 7.5,
      x: 188,
      y: 728
    });
    drawText(page, truncate(airline.name, 34), {
      color: colors.white,
      font: fonts.bold,
      size: 13,
      x: 188,
      y: 710
    });
  }
}

export async function renderAdminBookingPdf({
  booking,
  locale
}: {
  booking: AdminBookingDetail;
  locale: Locale;
}) {
  const branding = await getSiteBranding();
  const pdf = await PDFDocument.create();
  const airline = extractFlightAirlineBrand(booking);
  const airlineLogo = await embedRasterLogo(pdf, airline?.logoUrl ?? null);
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = {
    bold: boldFont,
    regular: regularFont
  };
  let y = 660;

  drawHeader(page, fonts, {
    airline,
    airlineLogo,
    booking,
    businessLocation: branding.businessLocation,
    contactEmail: branding.contactEmail,
    siteName: branding.siteName
  });

  drawBox(page, {height: 82, width: 250, x: 40, y: 632});
  drawBox(page, {height: 82, width: 250, x: 305, y: 632});
  drawLabelValue(page, fonts, {
    label: "Customer",
    value: booking.customerName,
    width: 210,
    x: 58,
    y: 690
  });
  drawLabelValue(page, fonts, {
    label: "Email",
    value: booking.customerEmail,
    width: 210,
    x: 58,
    y: 660
  });
  drawLabelValue(page, fonts, {
    label: "Booking status",
    value: humanize(booking.status),
    width: 110,
    x: 323,
    y: 690
  });
  drawLabelValue(page, fonts, {
    label: "Payment",
    value: humanize(booking.paymentStatus),
    width: 110,
    x: 445,
    y: 690
  });
  drawLabelValue(page, fonts, {
    label: "Confirmed",
    value: booking.confirmedAt ? formatDateTime(booking.confirmedAt, locale) : "Not confirmed",
    width: 210,
    x: 323,
    y: 660
  });

  y = 595;
  drawText(page, "Commercial summary", {font: boldFont, size: 13, x: 40, y});
  drawBox(page, {color: colors.pale, height: 118, width: 250, x: 40, y: y - 130});
  drawBox(page, {height: 118, width: 250, x: 305, y: y - 130});
  drawMoneyRow(page, fonts, {amountMinor: booking.subtotalAmountMinor, booking, label: "Subtotal", locale, y: y - 35});
  drawMoneyRow(page, fonts, {amountMinor: booking.taxAmountMinor, booking, label: "Taxes", locale, y: y - 55});
  drawMoneyRow(page, fonts, {amountMinor: booking.discountAmountMinor, booking, label: "Discount", locale, y: y - 75});
  drawMoneyRow(page, fonts, {amountMinor: booking.totalAmountMinor, booking, isTotal: true, label: "Total", locale, y: y - 100});

  drawLabelValue(page, fonts, {
    label: "Captured payment",
    value: formatMoney({amountMinor: booking.paymentAmountCapturedMinor, currency: booking.currency}, locale),
    width: 210,
    x: 58,
    y: y - 35
  });
  drawLabelValue(page, fonts, {
    label: "Refunded",
    value: formatMoney({amountMinor: booking.paymentAmountRefundedMinor, currency: booking.currency}, locale),
    width: 210,
    x: 58,
    y: y - 68
  });
  drawLabelValue(page, fonts, {
    label: "Provider reference",
    value: booking.paymentProviderReference ?? "Not available",
    width: 210,
    x: 58,
    y: y - 101
  });

  y = 425;
  drawText(page, "Passenger manifest", {font: boldFont, size: 13, x: 40, y});
  y -= 24;

  const travelers = booking.travelers.length > 0
    ? booking.travelers
    : [{dateOfBirth: null, documentNumberLast4: null, firstName: "Traveler", id: "fallback", lastName: "", nationalityCountryCode: null, travelerType: "adult" as const}];

  for (const traveler of travelers.slice(0, 6)) {
    drawBox(page, {height: 34, width: 515, x: 40, y: y - 24});
    drawText(page, `${traveler.firstName} ${traveler.lastName}`.trim(), {
      font: boldFont,
      size: 10.5,
      x: 55,
      y
    });
    drawText(page, humanize(traveler.travelerType), {
      color: colors.muted,
      font: regularFont,
      size: 9,
      x: 250,
      y
    });
    drawText(page, traveler.nationalityCountryCode ?? "Nationality pending", {
      color: colors.muted,
      font: regularFont,
      size: 9,
      x: 355,
      y
    });
    drawText(page, traveler.documentNumberLast4 ? `Doc ****${traveler.documentNumberLast4}` : "Document pending", {
      color: colors.muted,
      font: regularFont,
      size: 9,
      x: 455,
      y
    });
    y -= 42;
  }

  y -= 8;
  drawText(page, "Booked services", {font: boldFont, size: 13, x: 40, y});
  y -= 24;

  for (const item of booking.items.slice(0, 6)) {
    const serviceWindow = item.serviceStartAt
      ? `${formatDateTime(item.serviceStartAt, locale)}${item.serviceEndAt ? ` - ${formatDateTime(item.serviceEndAt, locale)}` : ""}`
      : "Service time pending";

    drawBox(page, {height: 48, width: 515, x: 40, y: y - 36});
    drawText(page, truncate(item.title, 56), {
      font: boldFont,
      size: 10,
      x: 55,
      y
    });
    drawText(page, `${humanize(item.bookingType)} | Qty ${item.quantity} | ${humanize(item.status)}`, {
      color: colors.muted,
      font: regularFont,
      size: 8.5,
      x: 55,
      y: y - 14
    });
    drawText(page, truncate(serviceWindow, 42), {
      color: colors.muted,
      font: regularFont,
      size: 8.5,
      x: 250,
      y: y - 14
    });
    drawText(page, formatMoney({amountMinor: item.totalAmountMinor, currency: booking.currency}, locale), {
      font: boldFont,
      size: 9,
      x: 462,
      y
    });
    y -= 58;

    if (y < 80) {
      break;
    }
  }

  page.drawRectangle({
    color: airline ? hexToRgb(airline.theme.primary) : colors.foreground,
    height: 44,
    width: pageWidth,
    x: 0,
    y: 0
  });
  drawText(page, `Generated from the ${branding.siteName} admin panel. Internal use only.`, {
    color: colors.ivory,
    font: regularFont,
    size: 8.5,
    x: 40,
    y: 18
  });
  drawText(page, booking.bookingReference, {
    color: airline ? hexToRgb(airline.theme.accent) : colors.accent,
    font: boldFont,
    size: 8.5,
    x: 470,
    y: 18
  });

  return pdf.save();
}
