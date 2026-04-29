import {Document, Image, Page, Text, View} from "@react-pdf/renderer";

import {type Locale} from "@/lib/i18n/routing";
import {isLikelyPdfRasterImageUrl, type AirlineBrandTheme} from "@/lib/flights/airline-branding";
import {type SupportedCurrency} from "@/lib/money";

import {
  formatPdfDate,
  formatPdfDateTime,
  formatPdfDuration,
  formatPdfMoney,
  defaultPdfBranding,
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

function FlightSegmentCard({
  locale,
  segment
}: {
  locale: Locale;
  segment: FlightTicketData["segments"][number];
}) {
  return (
    <View style={[pdfStyles.card, {borderColor: segment.airlineTheme.accent}]}>
      <View style={pdfStyles.rowBetween}>
        <View style={pdfStyles.airlineIdentityRow}>
          {isLikelyPdfRasterImageUrl(segment.airlineLogoUrl) ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={segment.airlineLogoUrl ?? ""} style={pdfStyles.airlineHeaderLogo} />
            </>
          ) : (
            <View
              style={[
                pdfStyles.airlineBadge,
                {backgroundColor: segment.airlineTheme.primary}
              ]}
            >
              <Text
                style={[
                  pdfStyles.airlineBadgeText,
                  {color: segment.airlineTheme.textOnPrimary}
                ]}
              >
                {segment.airlineCode}
              </Text>
            </View>
          )}
          <View>
            <Text style={pdfStyles.keyLabel}>Airline and flight</Text>
            <Text style={pdfStyles.keyValue}>
              {segment.airlineName} | {segment.flightNumber}
            </Text>
          </View>
        </View>
        <View style={pdfStyles.pill}>
          <Text style={pdfStyles.pillText}>{segment.cabinClass}</Text>
        </View>
      </View>

      <View style={[pdfStyles.twoColumn, {marginTop: 12}]}>
        <View style={{width: "47%"}}>
          <Text style={pdfStyles.keyLabel}>Departure</Text>
          <Text style={pdfStyles.keyValueStrong}>{segment.departureAirportCode}</Text>
          <Text style={pdfStyles.keyValue}>{segment.departureCityName}</Text>
          <Text style={pdfStyles.bodyText}>{segment.departureAirportName}</Text>
          <Text style={[pdfStyles.bodyText, {marginTop: 4}]}>
            {formatPdfDateTime(segment.departureAt, locale)}
          </Text>
        </View>
        <View style={{width: "47%"}}>
          <Text style={pdfStyles.keyLabel}>Arrival</Text>
          <Text style={pdfStyles.keyValueStrong}>{segment.arrivalAirportCode}</Text>
          <Text style={pdfStyles.keyValue}>{segment.arrivalCityName}</Text>
          <Text style={pdfStyles.bodyText}>{segment.arrivalAirportName}</Text>
          <Text style={[pdfStyles.bodyText, {marginTop: 4}]}>
            {formatPdfDateTime(segment.arrivalAt, locale)}
          </Text>
        </View>
      </View>

      <View style={[pdfStyles.twoColumn, {marginTop: 12}]}>
        <View style={{width: "47%"}}>
          <Text style={pdfStyles.keyLabel}>Duration and stops</Text>
          <Text style={pdfStyles.bodyText}>
            {formatPdfDuration(segment.durationMinutes)} | {segment.stopSummary}
          </Text>
        </View>
        <View style={{width: "47%"}}>
          <Text style={pdfStyles.keyLabel}>Baggage allowance</Text>
          <Text style={pdfStyles.bodyText}>{segment.baggageAllowance}</Text>
        </View>
      </View>
    </View>
  );
}

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

  return (
    <Document
      author={branding.siteName}
      subject={`E-ticket ${ticket.bookingReference}`}
      title={`${branding.siteName} Flight E-Ticket ${ticket.bookingReference}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={[pdfStyles.header, {backgroundColor: ticket.primaryAirline.theme.primary}]}>
          <View style={pdfStyles.headerTop}>
            <View style={{width: "58%"}}>
              <Text style={pdfStyles.brandKicker}>Travel document</Text>
              {branding.logoUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={branding.logoUrl} style={pdfStyles.brandImage} />
                </>
              ) : (
                <Text style={pdfStyles.brandName}>{branding.siteName}</Text>
              )}
              <Text style={pdfStyles.headerMeta}>
                {branding.businessLocation} | {branding.contactEmail}
              </Text>
            </View>
            <View style={pdfStyles.referencePanel}>
              <Text style={pdfStyles.referenceLabel}>Booking reference</Text>
              <Text style={pdfStyles.referenceValue}>{ticket.bookingReference}</Text>
            </View>
          </View>

          <View style={[pdfStyles.airlineIdentityRow, {marginTop: 16}]}>
            {isLikelyPdfRasterImageUrl(ticket.primaryAirline.logoUrl) ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={ticket.primaryAirline.logoUrl ?? ""} style={pdfStyles.airlineHeaderLogo} />
              </>
            ) : (
              <View
                style={[
                  pdfStyles.airlineBadge,
                  {backgroundColor: ticket.primaryAirline.theme.accent}
                ]}
              >
                <Text
                  style={[
                    pdfStyles.airlineBadgeText,
                    {color: ticket.primaryAirline.theme.primary}
                  ]}
                >
                  {ticket.primaryAirline.code}
                </Text>
              </View>
            )}
            <View>
              <Text style={pdfStyles.referenceLabel}>Selected airline</Text>
              <Text style={[pdfStyles.referenceValue, {fontSize: 13}]}>
                {ticket.primaryAirline.name}
              </Text>
            </View>
          </View>

          <Text style={pdfStyles.documentTitle}>Electronic Ticket Receipt</Text>
          <Text style={pdfStyles.documentSubTitle}>
            Official flight itinerary issued on {formatPdfDate(ticket.bookingDate, locale)}.
            Present this document with a valid passport or government-issued ID.
          </Text>

          {firstSegment ? (
            <View style={pdfStyles.routeBoard}>
              <View style={pdfStyles.routeBoardColumn}>
                <Text style={pdfStyles.routeAirportCode}>{firstSegment.departureAirportCode}</Text>
                <Text style={pdfStyles.routeAirportName}>
                  {firstSegment.departureCityName} | {firstSegment.departureAirportName}
                </Text>
              </View>
              <Text style={pdfStyles.routeBoardMeta}>
                {routeMeta}
                {"\n"}
                {formatPdfDuration(
                  ticket.segments.reduce((total, segment) => total + segment.durationMinutes, 0)
                )}
              </Text>
              <View style={[pdfStyles.routeBoardColumn, pdfStyles.textRight]}>
                <Text style={pdfStyles.routeAirportCode}>{lastSegment.arrivalAirportCode}</Text>
                <Text style={pdfStyles.routeAirportName}>
                  {lastSegment.arrivalCityName} | {lastSegment.arrivalAirportName}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={pdfStyles.statusStrip}>
          <Text style={pdfStyles.statusStripText}>Status: {ticket.bookingStatus}</Text>
          <Text style={pdfStyles.statusStripText}>Cabin: {ticket.cabinClass}</Text>
          <Text style={pdfStyles.statusStripText}>
            Supplier: {ticket.supplierReference ?? "Pending"}
          </Text>
        </View>

        <View style={pdfStyles.body}>
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Passenger and ticketing</Text>
            {ticket.passengerNames.length > 0 ? (
              ticket.passengerNames.map((name, index) => (
                <View key={`${name}-${index}`} style={pdfStyles.card}>
                  <View style={pdfStyles.rowBetween}>
                    <View style={{width: "48%"}}>
                      <Text style={pdfStyles.keyLabel}>Passenger name</Text>
                      <Text style={pdfStyles.keyValueStrong}>{name}</Text>
                    </View>
                    <View style={{width: "23%"}}>
                      <Text style={pdfStyles.keyLabel}>Ticket number</Text>
                      <Text style={pdfStyles.keyValue}>
                        {ticket.bookingReference}-{String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>
                    <View style={{width: "22%"}}>
                      <Text style={pdfStyles.keyLabel}>Document type</Text>
                      <Text style={pdfStyles.keyValue}>E-ticket</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={pdfStyles.card}>
                <Text style={pdfStyles.bodyText}>
                  Passenger details are attached to your confirmed booking record.
                </Text>
              </View>
            )}
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Itinerary</Text>
            {ticket.segments.map((segment) => (
              <FlightSegmentCard
                key={`${segment.flightNumber}-${segment.departureAt}`}
                locale={locale}
                segment={segment}
              />
            ))}
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Fare receipt</Text>
            <View style={pdfStyles.card}>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Base fare</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(ticket.priceBaseFareMinor, ticket.currency, locale)}
                </Text>
              </View>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Taxes</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(ticket.priceTaxMinor, ticket.currency, locale)}
                </Text>
              </View>
              <View style={pdfStyles.divider} />
              <View style={pdfStyles.rowBetween}>
                <Text style={pdfStyles.keyValueStrong}>Total paid</Text>
                <Text style={pdfStyles.keyValueStrong}>
                  {formatPdfMoney(ticket.priceTotalMinor, ticket.currency, locale)}
                </Text>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Travel notices</Text>
            <View style={[pdfStyles.card, pdfStyles.cardMuted]}>
              <Text style={[pdfStyles.bodyText, {marginBottom: 6}]}>
                Check in online where available and arrive at the airport with enough time for security, document verification, and boarding.
              </Text>
              <Text style={[pdfStyles.bodyText, {marginBottom: 6}]}>
                Baggage rules: {ticket.baggageRule}
              </Text>
              <Text style={pdfStyles.bodyText}>
                Contact: {branding.contactEmail} | {branding.supportPhone}
                {ticket.supplierReference ? ` | Supplier reference: ${ticket.supplierReference}` : ""}
              </Text>
            </View>
          </View>
        </View>

        <Text fixed style={pdfStyles.footer}>
          This is your official e-ticket receipt | {branding.siteName} | {branding.businessLocation}
        </Text>
      </Page>
    </Document>
  );
}
