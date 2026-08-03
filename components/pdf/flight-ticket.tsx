import {Document, Image, Page, StyleSheet, Text, View} from "@react-pdf/renderer";

import {type Locale} from "@/lib/i18n/routing";
import {isLikelyPdfRasterImageUrl, type AirlineBrandTheme} from "@/lib/flights/airline-branding";
import {type SupportedCurrency} from "@/lib/money";

import {
  defaultPdfBranding,
  formatPdfDate,
  formatPdfMoney,
  formatPdfTime,
  getTicketLogoDimensions,
  type PdfBranding
} from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlightTicketData = {
  primaryAirline: {
    code: string;
    logoUrl: string | null;
    name: string;
    theme: AirlineBrandTheme;
  };
  baggageRule: string;
  bookingDate: string;
  bookingReference: string;
  bookingStatus: string;
  cabinClass: string;
  currency: SupportedCurrency;
  passengerNames: string[];
  priceBaseFareMinor: number;
  priceTaxMinor: number;
  priceTotalMinor: number;
  segments: Array<{
    airlineName: string;
    airlineCode: string;
    airlineLogoUrl: string | null;
    airlineTheme: AirlineBrandTheme;
    arrivalAirportCode: string;
    arrivalAirportName: string;
    arrivalAt: string;
    arrivalCityName: string;
    baggageAllowance: string;
    cabinClass: string;
    departureAirportCode: string;
    departureAirportName: string;
    departureAt: string;
    departureCityName: string;
    durationMinutes: number;
    flightNumber: string;
    stopSummary: string;
  }>;
  supplierReference: string | null;
};

type FlightTicketProps = {
  branding?: PdfBranding;
  locale: Locale;
  ticket: FlightTicketData;
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE = "#1B4FA0";
const DARK = "#0D1B2E";
const BODY = "#2C2C2C";
const SOFT = "#5A5A5A";
const MUTED = "#888888";
const INFO_BG = "#D4E8F7";
const INFO_LABEL = "#3D7BAD";
const BORDER = "#CCCCCC";
const ROW_LINE = "#EEEEEE";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  // ─ Page ────────────────────────────────────────────────────────────────────
  page: {
    backgroundColor: WHITE,
    color: DARK,
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingBottom: 52,
    paddingHorizontal: 36,
    paddingTop: 24
  },

  // ─ Header ──────────────────────────────────────────────────────────────────
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  logoFallback: {
    color: BLUE,
    fontFamily: "Helvetica-Bold",
    fontSize: 20
  },
  pnrSide: {
    alignItems: "center"
  },
  barcodeContainer: {
    flexDirection: "row",
    height: 36
  },
  pnrCode: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 2.5,
    marginTop: 5,
    textAlign: "center"
  },

  // ─ Rules ───────────────────────────────────────────────────────────────────
  rulePrimary: {
    backgroundColor: BLUE,
    height: 2,
    marginBottom: 14
  },
  ruleLight: {
    backgroundColor: BORDER,
    height: 0.5,
    marginBottom: 8,
    marginTop: 8
  },

  // ─ Page title ──────────────────────────────────────────────────────────────
  pageTitle: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 14
  },

  // ─ Info box ────────────────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: INFO_BG,
    borderRadius: 2,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5
  },
  infoRowLast: {
    flexDirection: "row"
  },
  infoLabel: {
    color: INFO_LABEL,
    fontSize: 8.5,
    width: "40%"
  },
  infoValue: {
    color: DARK,
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5
  },

  // ─ Segment box ─────────────────────────────────────────────────────────────
  segment: {
    borderColor: BORDER,
    borderWidth: 0.5,
    marginBottom: 14
  },
  segmentHeader: {
    backgroundColor: BLUE,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  segmentHeaderText: {
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5
  },
  segmentBody: {
    padding: 10
  },

  // ─ Flight columns ──────────────────────────────────────────────────────────
  flightColRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 10
  },
  colCarrierFlight: {
    width: "22%"
  },
  colDepart: {
    width: "31%"
  },
  colIcon: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 14,
    width: "14%"
  },
  colArrive: {
    width: "33%"
  },
  colHeaderLabel: {
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase"
  },
  carrierBig: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    lineHeight: 1.05
  },
  subLabel: {
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 6,
    textTransform: "uppercase"
  },
  flightTimeBig: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    lineHeight: 1.05
  },
  flightCityLine: {
    color: BODY,
    fontSize: 8.5,
    lineHeight: 1.35,
    marginTop: 4
  },
  flightAirportLine: {
    color: SOFT,
    fontSize: 8,
    lineHeight: 1.3
  },
  flightDateLine: {
    color: BODY,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    marginTop: 2
  },
  planeIcon: {
    color: BLUE,
    fontSize: 18
  },

  // ─ Segment detail row ──────────────────────────────────────────────────────
  detailRow: {
    borderTopColor: BORDER,
    borderTopWidth: 0.5,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 8
  },
  detailCell: {
    marginBottom: 4,
    marginRight: 14
  },
  detailLabel: {
    color: MUTED,
    fontSize: 6.5,
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: "uppercase"
  },
  detailValue: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5
  },

  // ─ Footnote ────────────────────────────────────────────────────────────────
  footnote: {
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 1.5,
    marginBottom: 14,
    marginTop: 4
  },

  // ─ Fare conditions ─────────────────────────────────────────────────────────
  fareCondTitle: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    marginBottom: 4,
    marginTop: 10
  },
  fareCondItem: {
    color: BODY,
    fontSize: 8.5,
    lineHeight: 1.5,
    marginBottom: 1
  },

  // ─ Receipt (page 2) ────────────────────────────────────────────────────────
  receiptTitle: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 16
  },
  receiptRow: {
    alignItems: "flex-start",
    borderBottomColor: ROW_LINE,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingVertical: 7
  },
  receiptLabel: {
    color: BODY,
    fontSize: 8.5,
    width: "42%"
  },
  receiptValue: {
    color: DARK,
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5
  },
  receiptTotalRow: {
    alignItems: "center",
    borderBottomColor: ROW_LINE,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingVertical: 10
  },
  receiptTotalLabel: {
    color: DARK,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    width: "42%"
  },
  receiptTotalValue: {
    color: BLUE,
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 15
  },

  // ─ Footer ──────────────────────────────────────────────────────────────────
  footer: {
    bottom: 18,
    color: "#AAAAAA",
    fontSize: 7.5,
    left: 36,
    position: "absolute",
    right: 36,
    textAlign: "center"
  }
});

// ─── Visual barcode (deterministic bars from PNR) ────────────────────────────

function VisualBarcode({value}: {value: string}) {
  const bars: Array<{w: number; dark: boolean}> = [];
  const src = (value + value + value).slice(0, 48);

  bars.push({w: 5, dark: false});
  bars.push({w: 1, dark: true}, {w: 1, dark: false}, {w: 1, dark: true});

  for (let i = 0; i < src.length; i++) {
    const code = src.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const bit = (code >> b) & 1;
      bars.push({w: bit ? 2 : 1, dark: (i + b) % 2 === 0});
    }
    bars.push({w: 1, dark: false});
  }

  bars.push({w: 1, dark: true}, {w: 1, dark: false}, {w: 2, dark: true});
  bars.push({w: 5, dark: false});

  return (
    <View style={s.barcodeContainer}>
      {bars.map((bar, idx) => (
        <View
          key={idx}
          style={{backgroundColor: bar.dark ? "#000000" : WHITE, height: "100%", width: bar.w}}
        />
      ))}
    </View>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

function PageHeader({branding, pnr}: {branding: PdfBranding; pnr: string}) {
  return (
    <>
      <View style={s.headerRow}>
        <View>
          {branding.logoUrl && isLikelyPdfRasterImageUrl(branding.logoUrl) ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={branding.logoUrl} style={getTicketLogoDimensions(branding.ticketLogoSize)} />
          ) : (
            <Text style={s.logoFallback}>{branding.siteName}</Text>
          )}
        </View>

        <View style={s.pnrSide}>
          <VisualBarcode value={pnr} />
          <Text style={s.pnrCode}>{pnr}</Text>
        </View>
      </View>

      <View style={s.rulePrimary} />
    </>
  );
}

// ─── Flight segment panel ────────────────────────────────────────────────────

function FlightSegmentPanel({
  index,
  locale,
  segment
}: {
  index: number;
  locale: Locale;
  segment: FlightTicketData["segments"][number];
}) {
  const depDate = formatPdfDate(segment.departureAt, locale).toUpperCase();
  const arrDate = formatPdfDate(segment.arrivalAt, locale).toUpperCase();

  return (
    <View style={s.segment} wrap={false}>
      {/* Blue header */}
      <View style={s.segmentHeader}>
        <Text style={s.segmentHeaderText}>
          {"Flight "}
          {index + 1}
          {" — "}
          {segment.departureCityName}
          {" ("}
          {segment.departureAirportCode}
          {") to "}
          {segment.arrivalCityName}
          {" ("}
          {segment.arrivalAirportCode}
          {")"}
        </Text>
      </View>

      {/* Body */}
      <View style={s.segmentBody}>
        {/* Column header labels */}
        <View style={s.flightColRow}>
          {/* Carrier + Flight No */}
          <View style={s.colCarrierFlight}>
            <Text style={s.colHeaderLabel}>Carrier Code</Text>
            <Text style={s.carrierBig}>{segment.airlineCode}</Text>
            <Text style={s.subLabel}>Flight No</Text>
            <Text style={s.carrierBig}>{segment.flightNumber}</Text>
          </View>

          {/* Depart */}
          <View style={s.colDepart}>
            <Text style={s.colHeaderLabel}>Depart</Text>
            <Text style={s.flightTimeBig}>{formatPdfTime(segment.departureAt, locale)}</Text>
            <Text style={s.flightCityLine}>
              {segment.departureCityName} ({segment.departureAirportCode})
            </Text>
            <Text style={s.flightAirportLine}>{segment.departureAirportName}</Text>
            <Text style={s.flightDateLine}>{depDate}</Text>
          </View>

          {/* Plane icon */}
          <View style={s.colIcon}>
            <Text style={s.planeIcon}>{"✈"}</Text>
          </View>

          {/* Arrive */}
          <View style={s.colArrive}>
            <Text style={s.colHeaderLabel}>Arrive</Text>
            <Text style={s.flightTimeBig}>{formatPdfTime(segment.arrivalAt, locale)}</Text>
            <Text style={s.flightCityLine}>
              {segment.arrivalCityName} ({segment.arrivalAirportCode})
            </Text>
            <Text style={s.flightAirportLine}>{segment.arrivalAirportName}</Text>
            <Text style={s.flightDateLine}>{arrDate}</Text>
          </View>
        </View>

        {/* Detail row */}
        <View style={s.detailRow}>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Rez. Class</Text>
            <Text style={s.detailValue}>{segment.cabinClass.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Ticket Status</Text>
            <Text style={s.detailValue}>OK</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Cabin</Text>
            <Text style={s.detailValue}>{segment.cabinClass}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Stops</Text>
            <Text style={s.detailValue}>{segment.stopSummary}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Baggage</Text>
            <Text style={s.detailValue}>{segment.baggageAllowance}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Dep. Terminal</Text>
            <Text style={s.detailValue}>{segment.departureAirportName || "—"}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Arr. Terminal</Text>
            <Text style={s.detailValue}>{segment.arrivalAirportName || "—"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Fare conditions per segment ─────────────────────────────────────────────

const STANDARD_CONDITIONS = [
  "Changeable ticket subject to the conditions of change applicable to the fare class. Change fee and fare difference may apply.",
  "Cancellation terms apply as per fare conditions. Non-refundable fares remain non-refundable.",
  "No show fees apply.",
  "Ticket is valid for 12 months from first date of travel.",
  "One piece of hand luggage subject to airline policy."
];

// ─── Main component ──────────────────────────────────────────────────────────

export function FlightTicket({
  branding = defaultPdfBranding,
  locale,
  ticket
}: FlightTicketProps) {
  const passengerDisplay =
    ticket.passengerNames.length > 0 ? ticket.passengerNames.join(" / ") : "—";

  const ticketNumber = ticket.supplierReference ?? ticket.bookingReference;
  const issuedBy = `${branding.siteName} · ${formatPdfDate(ticket.bookingDate, locale)}`;

  return (
    <Document
      author={branding.siteName}
      subject={`E-Ticket ${ticket.bookingReference}`}
      title={`${branding.siteName} Flight E-Ticket — ${ticket.bookingReference}`}
    >
      {/* ══════════════════════════════════════════
          PAGE 1 — ITINERARY
      ══════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader branding={branding} pnr={ticket.bookingReference} />

        {/* Title */}
        <Text style={s.pageTitle}>Electronic Ticket Passenger Itinerary Receipt</Text>

        {/* Passenger info box */}
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Passenger</Text>
            <Text style={s.infoValue}>{passengerDisplay}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Booking Reference (PNR)</Text>
            <Text style={s.infoValue}>{ticket.bookingReference}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Ticket Number</Text>
            <Text style={s.infoValue}>{ticketNumber}</Text>
          </View>
          <View style={s.infoRowLast}>
            <Text style={s.infoLabel}>Issued By</Text>
            <Text style={s.infoValue}>{issuedBy}</Text>
          </View>
        </View>

        {/* Flight segments */}
        {ticket.segments.map((segment, index) => (
          <FlightSegmentPanel
            key={`${segment.flightNumber}-${segment.departureAt}`}
            index={index}
            locale={locale}
            segment={segment}
          />
        ))}

        {/* Footnote */}
        <Text style={s.footnote}>
          (1) OK = confirmed{"  "}(2) NVB = Not Valid Before{"  "}(3) NVA = Not Valid After{"  "}
          (4) Each passenger may check in baggage as indicated
        </Text>

        {/* Fare conditions per segment */}
        {ticket.segments.map((segment, index) => (
          <View key={`cond-${index}`} wrap={false}>
            <Text style={s.fareCondTitle}>
              {"Flight "}
              {index + 1}
              {" — "}
              {segment.cabinClass}
            </Text>
            {STANDARD_CONDITIONS.map((item, i) => (
              <Text key={i} style={s.fareCondItem}>
                {"* "}
                {item}
              </Text>
            ))}
            <Text style={s.fareCondItem}>
              {"* Baggage allowance: "}
              {segment.baggageAllowance}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <Text fixed style={s.footer}>
          {branding.siteName}
          {" · "}
          {branding.businessLocation}
          {" · "}
          {branding.contactEmail}
          {" · "}
          Official e-ticket receipt
        </Text>
      </Page>

      {/* ══════════════════════════════════════════
          PAGE 2 — RECEIPT
      ══════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader branding={branding} pnr={ticket.bookingReference} />

        <Text style={s.receiptTitle}>Receipt</Text>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Name</Text>
          <Text style={s.receiptValue}>{passengerDisplay}</Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Ticket Number</Text>
          <Text style={s.receiptValue}>{ticketNumber}</Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Booking Reference (PNR)</Text>
          <Text style={s.receiptValue}>{ticket.bookingReference}</Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Booking Status</Text>
          <Text style={s.receiptValue}>{ticket.bookingStatus}</Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Cabin Class</Text>
          <Text style={s.receiptValue}>{ticket.cabinClass}</Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Airline</Text>
          <Text style={s.receiptValue}>{ticket.primaryAirline.name}</Text>
        </View>

        <View style={s.ruleLight} />

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Fare</Text>
          <Text style={s.receiptValue}>
            {formatPdfMoney(ticket.priceBaseFareMinor, ticket.currency, locale)}
          </Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Taxes &amp; Fees</Text>
          <Text style={s.receiptValue}>
            {formatPdfMoney(ticket.priceTaxMinor, ticket.currency, locale)}
          </Text>
        </View>

        <View style={s.receiptTotalRow}>
          <Text style={s.receiptTotalLabel}>Total Amount</Text>
          <Text style={s.receiptTotalValue}>
            {formatPdfMoney(ticket.priceTotalMinor, ticket.currency, locale)}
          </Text>
        </View>

        <View style={s.ruleLight} />

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Issuing Agent &amp; Date</Text>
          <Text style={s.receiptValue}>{issuedBy}</Text>
        </View>

        {ticket.supplierReference ? (
          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Airline Reference</Text>
            <Text style={s.receiptValue}>{ticket.supplierReference}</Text>
          </View>
        ) : null}

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Support Contact</Text>
          <Text style={s.receiptValue}>
            {branding.contactEmail}
            {branding.supportPhone ? `  ·  ${branding.supportPhone}` : ""}
          </Text>
        </View>

        <View style={s.receiptRow}>
          <Text style={s.receiptLabel}>Baggage Rule</Text>
          <Text style={s.receiptValue}>{ticket.baggageRule}</Text>
        </View>

        {/* Footer */}
        <Text fixed style={s.footer}>
          {branding.siteName}
          {" · "}
          {branding.businessLocation}
          {" · "}
          {branding.contactEmail}
          {" · "}
          Official e-ticket receipt
        </Text>
      </Page>
    </Document>
  );
}
