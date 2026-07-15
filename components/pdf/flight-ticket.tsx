import {Document, Image, Page, Text, View} from "@react-pdf/renderer";

import {type Locale} from "@/lib/i18n/routing";
import {isLikelyPdfRasterImageUrl, type AirlineBrandTheme} from "@/lib/flights/airline-branding";
import {type SupportedCurrency} from "@/lib/money";

import {
  formatPdfDate,
  formatPdfShortDate,
  formatPdfTime,
  formatPdfDuration,
  formatPdfMoney,
  defaultPdfBranding,
  getTicketLogoDimensions,
  type PdfBranding,
  pdfStyles
} from "./shared";

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

// ─── Segment card ───────────────────────────────────────────────────────────

function FlightSegmentCard({
  locale,
  segment
}: {
  locale: Locale;
  segment: FlightTicketData["segments"][number];
}) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      {/* Airline accent stripe — thin colored top bar using airline's accent */}
      <View
        style={[pdfStyles.segmentAccentStripe, {backgroundColor: segment.airlineTheme.accent}]}
      />

      {/* Header: airline identity + cabin class pill */}
      <View style={pdfStyles.segmentHeader}>
        <View style={pdfStyles.segmentFlightInfo}>
          {isLikelyPdfRasterImageUrl(segment.airlineLogoUrl) ? (
            <View style={pdfStyles.airlineLogoFrame}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={segment.airlineLogoUrl ?? ""} style={pdfStyles.airlineHeaderLogo} />
            </View>
          ) : (
            <View
              style={[pdfStyles.airlineBadge, {backgroundColor: segment.airlineTheme.primary}]}
            >
              <Text
                style={[pdfStyles.airlineBadgeText, {color: segment.airlineTheme.textOnPrimary}]}
              >
                {segment.airlineCode}
              </Text>
            </View>
          )}
          <View>
            <Text style={pdfStyles.segmentFlightLabel}>Airline · Flight</Text>
            <Text style={pdfStyles.segmentFlightNumber}>
              {segment.airlineName} · {segment.flightNumber}
            </Text>
          </View>
        </View>
        <View style={pdfStyles.pill}>
          <Text style={pdfStyles.pillText}>{segment.cabinClass}</Text>
        </View>
      </View>

      <View style={pdfStyles.divider} />

      {/* Route: departure — connector — arrival, horizontal airline-standard layout */}
      <View style={pdfStyles.segmentRouteRow}>
        {/* Departure column */}
        <View style={{width: "35%"}}>
          <Text style={pdfStyles.segmentTime}>{formatPdfTime(segment.departureAt, locale)}</Text>
          <Text style={pdfStyles.segmentCode}>{segment.departureAirportCode}</Text>
          <Text style={pdfStyles.segmentCity}>{segment.departureCityName}</Text>
          <Text style={pdfStyles.segmentAirport}>{segment.departureAirportName}</Text>
          <Text style={pdfStyles.segmentDate}>{formatPdfShortDate(segment.departureAt, locale)}</Text>
        </View>

        {/* Center connector with duration */}
        <View style={[pdfStyles.segmentConnector, {width: "28%"}]}>
          <Text style={pdfStyles.segmentConnectorMeta}>
            {formatPdfDuration(segment.durationMinutes)}
          </Text>
          <View style={pdfStyles.segmentConnectorLine} />
          <Text style={pdfStyles.segmentConnectorMeta}>{segment.stopSummary}</Text>
        </View>

        {/* Arrival column — right-aligned */}
        <View style={{width: "35%"}}>
          <Text style={[pdfStyles.segmentTime, pdfStyles.textRight]}>
            {formatPdfTime(segment.arrivalAt, locale)}
          </Text>
          <Text style={[pdfStyles.segmentCode, pdfStyles.textRight]}>
            {segment.arrivalAirportCode}
          </Text>
          <Text style={[pdfStyles.segmentCity, pdfStyles.textRight]}>
            {segment.arrivalCityName}
          </Text>
          <Text style={[pdfStyles.segmentAirport, pdfStyles.textRight]}>
            {segment.arrivalAirportName}
          </Text>
          <Text style={[pdfStyles.segmentDate, pdfStyles.textRight]}>
            {formatPdfShortDate(segment.arrivalAt, locale)}
          </Text>
        </View>
      </View>

      <View style={pdfStyles.divider} />

      {/* Baggage allowance as compact pill tags */}
      <View style={pdfStyles.baggageRow}>
        <View style={pdfStyles.baggagePill}>
          <Text style={pdfStyles.baggagePillText}>{segment.baggageAllowance}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main ticket document ────────────────────────────────────────────────────

export function FlightTicket({
  branding = defaultPdfBranding,
  locale,
  ticket
}: FlightTicketProps) {
  const firstSegment = ticket.segments[0];
  const lastSegment = ticket.segments[ticket.segments.length - 1] ?? firstSegment;

  const routeMeta =
    ticket.segments.length <= 1
      ? "Nonstop"
      : `${ticket.segments.length - 1} stop${ticket.segments.length === 2 ? "" : "s"}`;

  // True journey duration: first departure to last arrival
  const totalJourneyMinutes =
    firstSegment && lastSegment
      ? Math.round(
          (new Date(lastSegment.arrivalAt).getTime() -
            new Date(firstSegment.departureAt).getTime()) /
            60000
        )
      : 0;

  return (
    <Document
      author={branding.siteName}
      subject={`E-ticket ${ticket.bookingReference}`}
      title={`${branding.siteName} Flight E-Ticket ${ticket.bookingReference}`}
    >
      <Page size="A4" style={pdfStyles.page}>

        {/* ─────────────────────────────────────────────────────────────
            HEADER — airline primary color background
            Contains: brand identity + booking ref (top bar)
                      route board with large airport codes + times
        ───────────────────────────────────────────────────────────── */}
        <View
          style={[pdfStyles.header, {backgroundColor: ticket.primaryAirline.theme.primary}]}
        >
          {/* Top bar: brand left, booking reference right */}
          <View style={pdfStyles.headerTop}>
            <View style={{width: "55%"}}>
              <Text style={pdfStyles.brandKicker}>Electronic Ticket Receipt</Text>
              {branding.logoUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={branding.logoUrl} style={getTicketLogoDimensions(branding.ticketLogoSize)} />
                </>
              ) : (
                <Text style={pdfStyles.brandName}>{branding.siteName}</Text>
              )}
              <Text style={pdfStyles.headerMeta}>
                {branding.businessLocation} · {branding.contactEmail}
              </Text>
            </View>

            {/* Booking reference panel — the PNR, prominently placed */}
            <View style={pdfStyles.referencePanel}>
              <Text style={pdfStyles.referenceLabel}>Booking Reference</Text>
              <Text style={pdfStyles.referenceValue}>{ticket.bookingReference}</Text>
              <Text style={[pdfStyles.referenceLabel, {marginTop: 8}]}>Issued</Text>
              <Text style={[pdfStyles.referenceValue, {fontSize: 11, letterSpacing: 0.3}]}>
                {formatPdfDate(ticket.bookingDate, locale)}
              </Text>
            </View>
          </View>

          {/* Route board — the hero element: departure → arrival */}
          {firstSegment ? (
            <View style={pdfStyles.routeBoard}>
              {/* Departure */}
              <View style={pdfStyles.routeBoardColumn}>
                <Text style={pdfStyles.routeBoardTime}>
                  {formatPdfTime(firstSegment.departureAt, locale)}
                </Text>
                <Text style={pdfStyles.routeAirportCode}>
                  {firstSegment.departureAirportCode}
                </Text>
                <Text style={pdfStyles.routeAirportName}>
                  {firstSegment.departureCityName}
                </Text>
                <Text style={[pdfStyles.routeAirportName, {marginTop: 1}]}>
                  {formatPdfShortDate(firstSegment.departureAt, locale)}
                </Text>
              </View>

              {/* Center: journey duration + visual connector + stop summary */}
              <View style={pdfStyles.routeBoardCenter}>
                <Text style={pdfStyles.routeBoardMeta}>
                  {formatPdfDuration(totalJourneyMinutes)}
                </Text>
                <View style={pdfStyles.routeConnectorLine} />
                <Text style={pdfStyles.routeBoardMeta}>{routeMeta}</Text>
              </View>

              {/* Arrival */}
              <View style={[pdfStyles.routeBoardColumn, {alignItems: "flex-end"}]}>
                <Text style={[pdfStyles.routeBoardTime, pdfStyles.textRight]}>
                  {formatPdfTime(lastSegment.arrivalAt, locale)}
                </Text>
                <Text style={[pdfStyles.routeAirportCode, pdfStyles.textRight]}>
                  {lastSegment.arrivalAirportCode}
                </Text>
                <Text style={[pdfStyles.routeAirportName, pdfStyles.textRight]}>
                  {lastSegment.arrivalCityName}
                </Text>
                <Text style={[pdfStyles.routeAirportName, {marginTop: 1, textAlign: "right"}]}>
                  {formatPdfShortDate(lastSegment.arrivalAt, locale)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ─────────────────────────────────────────────────────────────
            STATUS STRIP — booking status, cabin class, supplier ref
        ───────────────────────────────────────────────────────────── */}
        <View style={pdfStyles.statusStrip}>
          <Text style={pdfStyles.statusStripText}>Status: {ticket.bookingStatus}</Text>
          <Text style={pdfStyles.statusStripText}>Cabin: {ticket.cabinClass}</Text>
          <Text style={pdfStyles.statusStripText}>
            Supplier:{" "}
            {ticket.supplierReference ?? "Pending"}
          </Text>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            BODY
        ───────────────────────────────────────────────────────────── */}
        <View style={pdfStyles.body}>

          {/* ── Passengers ── */}
          <View style={pdfStyles.section} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Passengers</Text>
            <View style={pdfStyles.card}>
              {ticket.passengerNames.length > 0 ? (
                ticket.passengerNames.map((name, index) => (
                  <View key={`${name}-${index}`}>
                    {index > 0 ? <View style={pdfStyles.divider} /> : null}
                    <View style={pdfStyles.rowBetween}>
                      <View style={{width: "48%"}}>
                        <Text style={pdfStyles.keyLabel}>Passenger name</Text>
                        <Text style={pdfStyles.keyValue}>{name}</Text>
                      </View>
                      <View style={{width: "26%"}}>
                        <Text style={pdfStyles.keyLabel}>Ticket number</Text>
                        <Text style={pdfStyles.keyValue}>
                          {ticket.bookingReference}-{String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <View style={{width: "20%"}}>
                        <Text style={pdfStyles.keyLabel}>Type</Text>
                        <Text style={pdfStyles.keyValue}>E-ticket</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={pdfStyles.bodyText}>
                  Passenger details are attached to your confirmed booking record.
                </Text>
              )}
            </View>
          </View>

          {/* ── Flight itinerary — one card per segment ── */}
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Flight Itinerary
              {ticket.segments.length > 1 ? ` · ${ticket.segments.length} Segments` : ""}
            </Text>
            {ticket.segments.map((segment) => (
              <FlightSegmentCard
                key={`${segment.flightNumber}-${segment.departureAt}`}
                locale={locale}
                segment={segment}
              />
            ))}
          </View>

          {/* ── Fare receipt — proper table alignment ── */}
          <View style={pdfStyles.section} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Fare Receipt</Text>
            <View style={pdfStyles.card}>
              <View style={pdfStyles.fareRow}>
                <Text style={pdfStyles.fareRowLabel}>Base fare</Text>
                <Text style={pdfStyles.fareRowAmount}>
                  {formatPdfMoney(ticket.priceBaseFareMinor, ticket.currency, locale)}
                </Text>
              </View>
              <View style={[pdfStyles.divider, {marginVertical: 0}]} />
              <View style={pdfStyles.fareRow}>
                <Text style={pdfStyles.fareRowLabel}>Taxes &amp; fees</Text>
                <Text style={pdfStyles.fareRowAmount}>
                  {formatPdfMoney(ticket.priceTaxMinor, ticket.currency, locale)}
                </Text>
              </View>
              <View style={pdfStyles.fareTotalRow}>
                <Text style={pdfStyles.fareTotalLabel}>Total Paid</Text>
                <Text style={pdfStyles.fareTotalAmount}>
                  {formatPdfMoney(ticket.priceTotalMinor, ticket.currency, locale)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Check-in strip — boarding-pass visual anchor ── */}
          <View style={pdfStyles.checkInStrip} wrap={false}>
            <View style={pdfStyles.checkInCodeBox}>
              <Text style={pdfStyles.checkInCodeLabel}>Ref</Text>
              <Text style={pdfStyles.checkInCodeValue}>{ticket.bookingReference}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={pdfStyles.checkInTitle}>Check-in Information</Text>
              <Text style={pdfStyles.checkInText}>
                Present this document with a valid passport or government-issued photo ID. Online
                check-in typically opens 24{"\u2013"}48 hours before departure {"\u2014"} check your
                {"airline\u2019s"} website for specific times.
              </Text>
            </View>
          </View>

          {/* ── Travel notices — subdued footer section ── */}
          <View style={pdfStyles.section} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Travel Notices</Text>
            <View style={[pdfStyles.card, pdfStyles.cardMuted]}>
              <Text style={[pdfStyles.bodyText, {marginBottom: 5}]}>
                Arrive at the airport with sufficient time for security screening, document
                verification, and boarding. Most airlines recommend arriving 2{"\u2013"}3 hours
                before international departures.
              </Text>
              <Text style={[pdfStyles.bodyText, {marginBottom: 5}]}>
                Baggage allowance: {ticket.baggageRule}. Excess baggage fees are charged by the
                operating airline at check-in.
              </Text>
              <Text style={pdfStyles.bodyText}>
                Support: {branding.contactEmail} · {branding.supportPhone}
                {ticket.supplierReference
                  ? ` · Supplier reference: ${ticket.supplierReference}`
                  : ""}
              </Text>
            </View>
          </View>

        </View>

        {/* ─────────────────────────────────────────────────────────────
            FOOTER — fixed, appears on every page
        ───────────────────────────────────────────────────────────── */}
        <Text fixed style={pdfStyles.footer}>
          Official e-ticket receipt · {branding.siteName} · {branding.businessLocation} ·{" "}
          {branding.contactEmail}
        </Text>

      </Page>
    </Document>
  );
}
