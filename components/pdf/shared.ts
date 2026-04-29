import {StyleSheet} from "@react-pdf/renderer";

import {formatMoney, type SupportedCurrency} from "@/lib/money";

export const pdfColors = {
  accent: "#c9a84c",
  background: "#f7f3ec",
  border: "#e8e0d0",
  borderDark: "#315240",
  dark: "#111d15",
  foreground: "#1c3d2e",
  foregroundSoft: "#56705f",
  headingSoft: "#7a9a85",
  ivory: "#f5f0e8",
  white: "#ffffff"
} as const;

export type PdfBranding = {
  businessAddress: string;
  businessCity: string;
  businessCountry: string;
  businessLocation: string;
  contactEmail: string;
  logoUrl?: string | null;
  siteName: string;
  supportPhone: string;
};

export const defaultPdfBranding: PdfBranding = {
  businessAddress: "City, Country",
  businessCity: "City",
  businessCountry: "Country",
  businessLocation: "City, Country",
  contactEmail: "support@example.com",
  logoUrl: null,
  siteName: "Travel Desk",
  supportPhone: "+1 000 000 0000"
};

export const pdfStyles = StyleSheet.create({
  body: {
    paddingBottom: 72,
    paddingHorizontal: 32,
    paddingTop: 18
  },
  bodyText: {
    color: pdfColors.foregroundSoft,
    fontSize: 10.5,
    lineHeight: 1.55
  },
  brandAccent: {
    color: pdfColors.accent
  },
  brandKicker: {
    color: pdfColors.accent,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.4,
    marginBottom: 5,
    textTransform: "uppercase"
  },
  brandName: {
    color: pdfColors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    lineHeight: 1.15
  },
  brandImage: {
    maxHeight: 38,
    maxWidth: 150,
    objectFit: "contain"
  },
  airlineBadge: {
    alignItems: "center",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  airlineBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 0.6
  },
  airlineHeaderLogo: {
    maxHeight: 34,
    maxWidth: 112,
    objectFit: "contain"
  },
  airlineIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  card: {
    borderColor: pdfColors.border,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12
  },
  cardMuted: {
    backgroundColor: pdfColors.background
  },
  divider: {
    backgroundColor: pdfColors.border,
    height: 1,
    marginVertical: 10
  },
  footer: {
    bottom: 24,
    color: pdfColors.foregroundSoft,
    fontSize: 9,
    left: 32,
    lineHeight: 1.5,
    position: "absolute",
    right: 32,
    textAlign: "center"
  },
  header: {
    backgroundColor: pdfColors.foreground,
    paddingBottom: 20,
    paddingHorizontal: 32,
    paddingTop: 24
  },
  headerMeta: {
    color: pdfColors.ivory,
    fontSize: 9.5,
    lineHeight: 1.45,
    marginTop: 6
  },
  headerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerEyebrow: {
    color: pdfColors.accent,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 8,
    textTransform: "uppercase"
  },
  headerReference: {
    color: pdfColors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginTop: 14
  },
  headerSubcopy: {
    color: pdfColors.ivory,
    fontSize: 11,
    marginTop: 6
  },
  documentTitle: {
    color: pdfColors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    lineHeight: 1.18,
    marginTop: 18
  },
  documentSubTitle: {
    color: pdfColors.ivory,
    fontSize: 10.5,
    lineHeight: 1.5,
    marginTop: 6
  },
  infoBox: {
    borderColor: pdfColors.border,
    borderRadius: 6,
    borderWidth: 1,
    padding: 10
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  keyLabel: {
    color: pdfColors.headingSoft,
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  keyValue: {
    color: pdfColors.foreground,
    fontSize: 11.5,
    lineHeight: 1.45
  },
  keyValueStrong: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 16
  },
  logo: {
    color: pdfColors.ivory,
    fontFamily: "Times-BoldItalic",
    fontSize: 24
  },
  page: {
    backgroundColor: pdfColors.white,
    color: pdfColors.foreground,
    fontFamily: "Helvetica",
    fontSize: 10
  },
  pill: {
    backgroundColor: pdfColors.background,
    borderColor: pdfColors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  pillText: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase"
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  section: {
    marginBottom: 14
  },
  sectionTitle: {
    color: pdfColors.headingSoft,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  textRight: {
    textAlign: "right"
  },
  referenceLabel: {
    color: pdfColors.ivory,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.1,
    marginBottom: 5,
    textTransform: "uppercase"
  },
  referencePanel: {
    borderColor: pdfColors.borderDark,
    borderRadius: 7,
    borderWidth: 1,
    minWidth: 142,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  referenceValue: {
    color: pdfColors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 14
  },
  routeAirportCode: {
    color: pdfColors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 28
  },
  routeAirportName: {
    color: pdfColors.ivory,
    fontSize: 9,
    lineHeight: 1.35,
    marginTop: 3
  },
  routeBoard: {
    alignItems: "center",
    backgroundColor: pdfColors.dark,
    borderColor: pdfColors.borderDark,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    padding: 14
  },
  routeBoardColumn: {
    width: "38%"
  },
  routeBoardMeta: {
    color: pdfColors.accent,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
    width: "20%"
  },
  statusStrip: {
    backgroundColor: pdfColors.background,
    borderBottomColor: pdfColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 10
  },
  statusStripText: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between"
  }
});

export function formatPdfDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPdfDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPdfMoney(
  amountMinor: number,
  currency: SupportedCurrency,
  locale: string
) {
  return formatMoney(
    {
      amountMinor,
      currency
    },
    locale
  );
}

export function formatPdfDuration(durationMinutes: number) {
  const safeMinutes = Number.isFinite(durationMinutes) ? Math.max(durationMinutes, 0) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function humanizePdfLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
