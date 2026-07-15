import {StyleSheet} from "@react-pdf/renderer";

import {formatMoney, type SupportedCurrency} from "@/lib/money";

export const pdfColors = {
  // Core navy/blue brand palette (matches app's corporate white/blue theme)
  headerBg: "#1E3A8A",        // blue-900 — header background for hotel/generic docs
  primary: "#2563EB",         // blue-600 — primary accent
  accent: "#60A5FA",          // blue-400 — accent on dark backgrounds
  // Page backgrounds
  background: "#F8FAFC",      // slate-50 — general muted background
  muted: "#EFF6FF",           // blue-50 — blue-tinted muted background
  white: "#FFFFFF",
  // Text hierarchy
  dark: "#0F172A",            // slate-900 — strongest text / dark surfaces
  foreground: "#1E293B",      // slate-800 — primary body text
  foregroundSoft: "#475569",  // slate-600 — secondary body text
  headingSoft: "#94A3B8",     // slate-400 — labels, section titles
  // Borders
  border: "#E2E8F0",          // slate-200 — general borders
  borderAccent: "#BFDBFE",    // blue-200 — accented / on-blue borders
  // On-dark surfaces (inside navy/airline-color headers)
  onDark: "#FFFFFF",
  onDarkSoft: "#BFDBFE",      // blue-200 — secondary text on dark bg
  onDarkMuted: "#93C5FD",     // blue-300 — tertiary text on dark bg
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
  ticketLogoSize?: "small" | "medium" | "large";
};

export function getTicketLogoDimensions(size: "small" | "medium" | "large" | undefined) {
  switch (size) {
    case "small": return {maxHeight: 28, maxWidth: 100};
    case "large": return {maxHeight: 56, maxWidth: 200};
    default: return {maxHeight: 40, maxWidth: 150};
  }
}

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
  // ─── Page ────────────────────────────────────────────────────────────────
  page: {
    backgroundColor: pdfColors.white,
    color: pdfColors.foreground,
    fontFamily: "Helvetica",
    fontSize: 10
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: pdfColors.headerBg,
    paddingBottom: 18,
    paddingHorizontal: 32,
    paddingTop: 22
  },
  headerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerMeta: {
    color: pdfColors.onDarkSoft,
    fontSize: 9,
    lineHeight: 1.45,
    marginTop: 5
  },
  headerEyebrow: {
    color: pdfColors.accent,
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginTop: 8,
    textTransform: "uppercase"
  },
  headerReference: {
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginTop: 12
  },
  headerSubcopy: {
    color: pdfColors.onDarkSoft,
    fontSize: 11,
    marginTop: 6
  },
  documentTitle: {
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    lineHeight: 1.18,
    marginTop: 16
  },
  documentSubTitle: {
    color: pdfColors.onDarkSoft,
    fontSize: 10,
    lineHeight: 1.5,
    marginTop: 5
  },

  // ─── Brand ───────────────────────────────────────────────────────────────
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
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    lineHeight: 1.15
  },
  brandImage: {
    maxHeight: 36,
    maxWidth: 140,
    objectFit: "contain"
  },
  logo: {
    color: pdfColors.onDarkSoft,
    fontFamily: "Times-BoldItalic",
    fontSize: 22
  },

  // ─── Reference panel ─────────────────────────────────────────────────────
  referencePanel: {
    borderColor: pdfColors.borderAccent,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  referenceLabel: {
    color: pdfColors.onDarkSoft,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 1.1,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  referenceValue: {
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 14
  },

  // ─── Route board ─────────────────────────────────────────────────────────
  routeBoard: {
    alignItems: "center",
    backgroundColor: pdfColors.dark,
    borderColor: pdfColors.borderAccent,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 14
  },
  routeBoardColumn: {
    width: "36%"
  },
  routeBoardCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "24%"
  },
  routeBoardTime: {
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    lineHeight: 1.2
  },
  routeBoardMeta: {
    color: pdfColors.accent,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase"
  },
  routeConnectorLine: {
    backgroundColor: pdfColors.accent,
    height: 1,
    marginVertical: 5,
    width: "100%"
  },
  routeAirportCode: {
    color: pdfColors.onDark,
    fontFamily: "Helvetica-Bold",
    fontSize: 28
  },
  routeAirportName: {
    color: pdfColors.onDarkSoft,
    fontSize: 9,
    lineHeight: 1.35,
    marginTop: 2
  },

  // ─── Status strip ────────────────────────────────────────────────────────
  statusStrip: {
    backgroundColor: pdfColors.muted,
    borderBottomColor: pdfColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 9
  },
  statusStripText: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },

  // ─── Body ────────────────────────────────────────────────────────────────
  body: {
    paddingBottom: 64,
    paddingHorizontal: 32,
    paddingTop: 16
  },
  section: {
    marginBottom: 14
  },
  sectionTitle: {
    color: pdfColors.headingSoft,
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginBottom: 7,
    textTransform: "uppercase"
  },

  // ─── Cards ───────────────────────────────────────────────────────────────
  card: {
    borderColor: pdfColors.border,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  cardMuted: {
    backgroundColor: pdfColors.background
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

  // ─── Segment card components ─────────────────────────────────────────────
  segmentAccentStripe: {
    borderRadius: 2,
    height: 2,
    marginBottom: 10
  },
  segmentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  segmentFlightInfo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  segmentFlightLabel: {
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase"
  },
  segmentFlightNumber: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 11
  },
  segmentRouteRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  segmentTime: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    lineHeight: 1.2
  },
  segmentCode: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    lineHeight: 1.1
  },
  segmentCity: {
    color: pdfColors.foregroundSoft,
    fontSize: 9.5,
    lineHeight: 1.3,
    marginTop: 3
  },
  segmentAirport: {
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    lineHeight: 1.3
  },
  segmentDate: {
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    lineHeight: 1.3,
    marginTop: 1
  },
  segmentConnector: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 22
  },
  segmentConnectorLine: {
    backgroundColor: pdfColors.borderAccent,
    height: 1,
    marginVertical: 4,
    width: "100%"
  },
  segmentConnectorMeta: {
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase"
  },
  baggageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  baggagePill: {
    backgroundColor: pdfColors.muted,
    borderColor: pdfColors.borderAccent,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  baggagePillText: {
    color: pdfColors.foreground,
    fontSize: 9,
    letterSpacing: 0.3
  },

  // ─── Fare table ──────────────────────────────────────────────────────────
  fareRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6
  },
  fareRowLabel: {
    color: pdfColors.foregroundSoft,
    fontSize: 11
  },
  fareRowAmount: {
    color: pdfColors.foreground,
    fontSize: 11,
    textAlign: "right"
  },
  fareTotalRow: {
    alignItems: "center",
    backgroundColor: pdfColors.muted,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  fareTotalLabel: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  fareTotalAmount: {
    color: pdfColors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 17
  },

  // ─── Check-in strip ──────────────────────────────────────────────────────
  checkInStrip: {
    alignItems: "center",
    backgroundColor: pdfColors.muted,
    borderColor: pdfColors.borderAccent,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    padding: 14
  },
  checkInCodeBox: {
    alignItems: "center",
    borderColor: pdfColors.borderAccent,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 56,
    padding: 8
  },
  checkInCodeLabel: {
    color: pdfColors.headingSoft,
    fontSize: 7.5,
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: "center",
    textTransform: "uppercase"
  },
  checkInCodeValue: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center"
  },
  checkInTitle: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  checkInText: {
    color: pdfColors.foregroundSoft,
    fontSize: 9.5,
    lineHeight: 1.5
  },

  // ─── Typography ──────────────────────────────────────────────────────────
  bodyText: {
    color: pdfColors.foregroundSoft,
    fontSize: 10.5,
    lineHeight: 1.55
  },
  keyLabel: {
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    letterSpacing: 1.1,
    marginBottom: 3,
    textTransform: "uppercase"
  },
  keyValue: {
    color: pdfColors.foreground,
    fontSize: 11,
    lineHeight: 1.45
  },
  keyValueStrong: {
    color: pdfColors.foreground,
    fontFamily: "Helvetica-Bold",
    fontSize: 14
  },

  // ─── Layout ──────────────────────────────────────────────────────────────
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  textRight: {
    textAlign: "right"
  },
  divider: {
    backgroundColor: pdfColors.border,
    height: 1,
    marginVertical: 10
  },

  // ─── Pills ───────────────────────────────────────────────────────────────
  pill: {
    backgroundColor: pdfColors.background,
    borderColor: pdfColors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  pillText: {
    color: pdfColors.dark,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textTransform: "uppercase"
  },

  // ─── Airline identity ────────────────────────────────────────────────────
  airlineBadge: {
    alignItems: "center",
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 40,
    paddingHorizontal: 7,
    paddingVertical: 6
  },
  airlineBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    letterSpacing: 0.6
  },
  airlineHeaderLogo: {
    maxHeight: 32,
    maxWidth: 100,
    objectFit: "contain"
  },
  airlineLogoFrame: {
    alignItems: "center",
    backgroundColor: pdfColors.white,
    borderRadius: 5,
    height: 38,
    justifyContent: "center",
    padding: 5,
    width: 66
  },
  airlineIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },

  // ─── Footer ──────────────────────────────────────────────────────────────
  footer: {
    bottom: 22,
    color: pdfColors.headingSoft,
    fontSize: 8.5,
    left: 32,
    lineHeight: 1.5,
    position: "absolute",
    right: 32,
    textAlign: "center"
  }
});

export function formatPdfDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPdfShortDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

export function formatPdfTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
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
