import "server-only";

import {type BookingDetailRecord} from "@/features/account/types";
import {type AdminBookingDetail} from "@/features/admin/types";
import {FlightTicket, type FlightTicketData} from "@/components/pdf/flight-ticket";
import {
  GenericBookingDocument,
  type GenericBookingDocumentData
} from "@/components/pdf/generic-booking-document";
import {HotelVoucher, type HotelVoucherData} from "@/components/pdf/hotel-voucher";
import {type PdfBranding} from "@/components/pdf/shared";
import {
  getAirlineBrandTheme,
  getPdfAirlineLogoUrl
} from "@/lib/flights/airline-branding";
import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";

type TicketBookingDetail = {
  bookingId: string;
  bookingReference: string;
  confirmedAt: string | null;
  createdAt: string;
  currency: SupportedCurrency;
  customerEmail: string;
  customerName?: string;
  items: Array<{
    bookingItemId: string;
    bookingType: string;
    currency: SupportedCurrency;
    description: string | null;
    quantity: number;
    serviceEndAt: string | null;
    serviceStartAt: string | null;
    snapshotPayload: Record<string, unknown>;
    status: string;
    subtotalAmountMinor: number;
    supplierConfirmationReference: string | null;
    taxAmountMinor: number;
    title: string;
    totalAmountMinor: number;
  }>;
  paymentStatus: string;
  primaryBookingType: string;
  status: string;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
  travelers: Array<{
    dateOfBirth: string | null;
    firstName: string;
    id: string;
    lastName: string;
    travelerType: string;
  }>;
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

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildTravelerNames(booking: TicketBookingDetail) {
  return booking.travelers.map((traveler) =>
    [traveler.firstName, traveler.lastName].filter(Boolean).join(" ").trim()
  ).filter(Boolean);
}

function buildServiceWindow(
  serviceStartAt: string | null,
  serviceEndAt: string | null
) {
  if (!serviceStartAt) {
    return serviceEndAt ? serviceEndAt : null;
  }

  return serviceEndAt ? `${serviceStartAt} - ${serviceEndAt}` : serviceStartAt;
}

function buildBaggageText(
  baggageAllowance: Record<string, unknown>,
  fallbackSummary: Record<string, unknown>
) {
  const cabin = asString(baggageAllowance.cabin) || asString(fallbackSummary.cabin);
  const checked = asString(baggageAllowance.checked) || asString(fallbackSummary.checked);
  const parts = [
    cabin ? `Cabin: ${cabin}` : "",
    checked ? `Checked: ${checked}` : ""
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "Refer to airline fare conditions";
}

function getAirlineLogoEntries(offer: Record<string, unknown>) {
  const metadata = asRecord(offer.metadata);
  const entries = asRecordArray(metadata.airlineLogos);
  const owner = asRecord(metadata.offerOwner);
  const allEntries = [
    ...entries,
    ...(Object.keys(owner).length > 0 ? [owner] : [])
  ];

  return new Map(
    allEntries
      .map((entry) => {
        const code = asString(entry.code).trim().toUpperCase();

        if (!code) {
          return null;
        }

        return [
          code,
          {
            code,
            logoUrl: asString(entry.logoUrl) || null,
            name: asString(entry.name) || code
          }
        ] as const;
      })
      .filter((entry): entry is readonly [
        string,
        {code: string; logoUrl: string | null; name: string}
      ] => Boolean(entry))
  );
}

function resolveSegmentAirline(
  segment: Record<string, unknown>,
  airlineLogoEntries: Map<string, {code: string; logoUrl: string | null; name: string}>
) {
  const code = asString(segment.marketingAirlineCode).trim().toUpperCase();
  const fallbackName =
    asString(segment.marketingAirlineName) ||
    asString(segment.operatingAirlineName) ||
    code ||
    "Airline";
  const entry = airlineLogoEntries.get(code);
  const name = entry?.name || fallbackName;
  const resolvedCode = code || entry?.code || "AIR";

  return {
    code: resolvedCode,
    logoUrl: getPdfAirlineLogoUrl({
      code: resolvedCode,
      logoUrl: entry?.logoUrl ?? null
    }),
    name,
    theme: getAirlineBrandTheme({
      code: resolvedCode,
      name
    })
  };
}

function mapFlightTicketData(
  booking: TicketBookingDetail
): FlightTicketData | null {
  const item = booking.items.find((entry) => entry.bookingType === "flight") ?? booking.items[0];

  if (!item) {
    return null;
  }

  const payload = asRecord(item.snapshotPayload);
  const offer = asRecord(payload.offer);
  const baggageSummary = asRecord(offer.baggageSummary);
  const legs = asRecordArray(offer.legs);
  const segments = legs.flatMap((leg) => asRecordArray(leg.segments));
  const airlineLogoEntries = getAirlineLogoEntries(offer);

  if (segments.length === 0) {
    return null;
  }

  const primaryAirline = resolveSegmentAirline(segments[0], airlineLogoEntries);

  return {
    primaryAirline,
    baggageRule:
      buildBaggageText({}, baggageSummary) || "Refer to airline fare conditions",
    bookingDate: booking.createdAt,
    bookingReference: booking.bookingReference,
    bookingStatus: humanize(booking.status),
    cabinClass: humanize(asString(offer.cabinClass) || "economy"),
    currency: booking.currency,
    passengerNames: buildTravelerNames(booking),
    priceBaseFareMinor: booking.subtotalAmountMinor,
    priceTaxMinor: booking.taxAmountMinor,
    priceTotalMinor: booking.totalAmountMinor,
    segments: segments.map((segment, index) => {
      const airline = resolveSegmentAirline(segment, airlineLogoEntries);

      return {
        airlineCode: airline.code,
        airlineLogoUrl: airline.logoUrl,
        airlineName: airline.name,
        airlineTheme: airline.theme,
        arrivalAirportCode: asString(segment.destinationAirportCode),
        arrivalAirportName: asString(segment.destinationAirportName),
        arrivalAt: asString(segment.arrivalAt),
        arrivalCityName: asString(segment.destinationCityName),
        baggageAllowance: buildBaggageText(
          asRecord(segment.baggageAllowance),
          baggageSummary
        ),
        cabinClass: humanize(asString(segment.cabinClass) || asString(offer.cabinClass) || "economy"),
        departureAirportCode: asString(segment.originAirportCode),
        departureAirportName: asString(segment.originAirportName),
        departureAt: asString(segment.departureAt),
        departureCityName: asString(segment.originCityName),
        durationMinutes: asNumber(segment.durationMinutes) ?? 0,
        flightNumber: asString(segment.flightNumber),
        stopSummary:
          segments.length === 1
            ? "Nonstop"
            : index === segments.length - 1
              ? `${segments.length - 1} total stop${segments.length - 1 === 1 ? "" : "s"}`
              : "Connection before next segment"
      };
    }),
    supplierReference: item.supplierConfirmationReference
  };
}

function mapHotelVoucherData(
  booking: TicketBookingDetail
): HotelVoucherData | null {
  const item = booking.items.find((entry) => entry.bookingType === "hotel") ?? booking.items[0];

  if (!item) {
    return null;
  }

  const payload = asRecord(item.snapshotPayload);
  const offer = asRecord(payload.offer);
  const selectedRoom = asRecord(payload.selectedRoom);
  const policies = asRecord(offer.policies);
  const guestCount = booking.travelers.length || asNumber(offer.guestCount) || 0;

  return {
    bookingDate: booking.createdAt,
    bookingReference: booking.bookingReference,
    bookingStatus: humanize(booking.status),
    cancellationPolicy:
      asString(selectedRoom.cancellationSummary) ||
      asString(policies.cancellation) ||
      "Cancellation policy is available in your account.",
    checkInDate: asString(offer.checkIn),
    checkInTime: asString(policies.checkIn) || "15:00",
    checkOutDate: asString(offer.checkOut),
    checkOutTime: asString(policies.checkOut) || "10:00",
    currency: booking.currency,
    guestCountLabel: `${guestCount} guest${guestCount === 1 ? "" : "s"}`,
    hotelAddress: [
      asString(offer.addressLine),
      asString(offer.cityName),
      asString(offer.countryName) || asString(offer.countryCode)
    ].filter(Boolean).join(", "),
    hotelName: item.title || asString(offer.propertyName) || "Hotel stay",
    priceBaseFareMinor: booking.subtotalAmountMinor,
    priceTaxMinor: booking.taxAmountMinor,
    priceTotalMinor: booking.totalAmountMinor,
    roomType: asString(selectedRoom.roomName) || "Room"
  };
}

function mapGenericDocumentData(
  booking: TicketBookingDetail
): GenericBookingDocumentData {
  const travelerNames = buildTravelerNames(booking);
  const customerLabel =
    booking.customerName ||
    travelerNames[0] ||
    booking.customerEmail;

  return {
    bookingDate: booking.createdAt,
    bookingReference: booking.bookingReference,
    bookingStatus: humanize(booking.status),
    currency: booking.currency,
    customerLabel,
    itemRows: booking.items.map((item) => ({
      amountMinor: item.totalAmountMinor,
      description: item.description,
      quantity: item.quantity,
      serviceWindow: buildServiceWindow(item.serviceStartAt, item.serviceEndAt),
      title: item.title
    })),
    productLabel: humanize(booking.primaryBookingType),
    priceBaseFareMinor: booking.subtotalAmountMinor,
    priceTaxMinor: booking.taxAmountMinor,
    priceTotalMinor: booking.totalAmountMinor,
    travelerNames
  };
}

export function toTicketBookingDetail(
  booking: BookingDetailRecord | AdminBookingDetail
): TicketBookingDetail {
  return {
    bookingId: booking.bookingId,
    bookingReference: booking.bookingReference,
    confirmedAt: booking.confirmedAt,
    createdAt: booking.createdAt,
    currency: booking.currency,
    customerEmail: booking.customerEmail,
    customerName: "customerName" in booking ? booking.customerName : undefined,
    items: booking.items.map((item) => ({
      bookingItemId: item.bookingItemId,
      bookingType: item.bookingType,
      currency: item.currency,
      description: item.description,
      quantity: item.quantity,
      serviceEndAt: item.serviceEndAt,
      serviceStartAt: item.serviceStartAt,
      snapshotPayload: item.snapshotPayload,
      status: item.status,
      subtotalAmountMinor: item.subtotalAmountMinor,
      supplierConfirmationReference: item.supplierConfirmationReference,
      taxAmountMinor: item.taxAmountMinor,
      title: item.title,
      totalAmountMinor: item.totalAmountMinor
    })),
    paymentStatus: booking.paymentStatus,
    primaryBookingType: booking.primaryBookingType,
    status: booking.status,
    subtotalAmountMinor: booking.subtotalAmountMinor,
    taxAmountMinor: booking.taxAmountMinor,
    totalAmountMinor: booking.totalAmountMinor,
    travelers: booking.travelers.map((traveler) => ({
      dateOfBirth: traveler.dateOfBirth,
      firstName: traveler.firstName,
      id: traveler.id,
      lastName: traveler.lastName,
      travelerType: traveler.travelerType
    }))
  };
}

export function buildBookingTicketDocument({
  branding,
  booking,
  locale
}: {
  branding?: PdfBranding;
  booking: TicketBookingDetail;
  locale: Locale;
}) {
  if (booking.primaryBookingType === "flight") {
    const ticket = mapFlightTicketData(booking);

    if (ticket) {
      return <FlightTicket branding={branding} locale={locale} ticket={ticket} />;
    }
  }

  if (booking.primaryBookingType === "hotel") {
    const voucher = mapHotelVoucherData(booking);

    if (voucher) {
      return <HotelVoucher branding={branding} locale={locale} voucher={voucher} />;
    }
  }

  return (
    <GenericBookingDocument
      branding={branding}
      documentData={mapGenericDocumentData(booking)}
      locale={locale}
    />
  );
}
