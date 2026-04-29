import "server-only";

import {type FlightSearchCriteria} from "@/features/flights/types";
import {isSupportedCurrency, toMinorUnit, type SupportedCurrency} from "@/lib/money";
import {type CabinClass} from "@/types/database-enums";

import {getMockAirportByCode, type FlightAirlineCatalogEntry, type FlightAirportCatalogEntry} from "./catalog";
import {duffel} from "./duffel-client";
import {
  type FlightOfferProvider,
  type ProviderFlightLeg,
  type ProviderFlightOffer,
  type ProviderFlightSearchContext,
  type ProviderFlightSegment
} from "./types";

type DuffelOffer = Awaited<ReturnType<typeof duffel.offers.list>>["data"][number];
type DuffelOfferSlice = DuffelOffer["slices"][number];
type DuffelOfferSegment = DuffelOfferSlice["segments"][number];
type DuffelOfferBaggage = DuffelOfferSegment["passengers"][number]["baggages"][number];
type DuffelFlightsCondition = NonNullable<
  DuffelOffer["conditions"]["change_before_departure"]
>;
type DuffelAirline = DuffelOffer["owner"];
type DuffelAirportLike = DuffelOfferSegment["origin"] | DuffelOfferSlice["origin"];
type DuffelCreateOfferRequest = Parameters<typeof duffel.offerRequests.create>[0];
type DuffelPassenger = DuffelCreateOfferRequest["passengers"][number];

function parseIsoDurationToMinutes(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const match =
    /^P(?:(?<days>\d+)D)?(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)?$/i.exec(
      value
    );

  if (!match?.groups) {
    return 0;
  }

  const days = Number(match.groups.days ?? 0);
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);
  const seconds = Number(match.groups.seconds ?? 0);

  return days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
}

function differenceInMinutes(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(Math.round((end - start) / 60_000), 0);
}

function toMinorAmount(amount: string | null | undefined, currency: SupportedCurrency) {
  const parsedAmount = Number(amount ?? 0);

  if (!Number.isFinite(parsedAmount)) {
    return 0;
  }

  return toMinorUnit(parsedAmount, currency);
}

function coerceSupportedCurrency(
  value: string | null | undefined,
  fallback: SupportedCurrency
): SupportedCurrency {
  const normalizedValue = value?.trim().toUpperCase();
  return normalizedValue && isSupportedCurrency(normalizedValue) ? normalizedValue : fallback;
}

function getAirlineCode(airline: DuffelAirline | null | undefined) {
  if (!airline) {
    return "XX";
  }

  return airline.iata_code?.trim().toUpperCase() || airline.id.slice(-2).toUpperCase();
}

function mapDuffelAirline(airline: DuffelAirline | null | undefined): FlightAirlineCatalogEntry {
  return {
    code: getAirlineCode(airline),
    name: airline?.name ?? "Airline pending confirmation"
  };
}

function getDuffelPlaceCityName(airport: DuffelAirportLike) {
  if ("city_name" in airport && typeof airport.city_name === "string" && airport.city_name.trim()) {
    return airport.city_name;
  }

  if ("city" in airport && airport.city?.name) {
    return airport.city.name;
  }

  return airport.name;
}

function getDuffelPlaceTimeZone(airport: DuffelAirportLike) {
  if ("time_zone" in airport && typeof airport.time_zone === "string" && airport.time_zone.trim()) {
    return airport.time_zone;
  }

  return "UTC";
}

function mapDuffelAirport(
  airport: DuffelAirportLike | null | undefined,
  fallbackCode?: string
): FlightAirportCatalogEntry {
  const airportCode =
    airport?.iata_code?.trim().toUpperCase() ||
    fallbackCode?.trim().toUpperCase() ||
    airport?.id?.slice(-3).toUpperCase() ||
    "XXX";
  const catalogAirport = getMockAirportByCode(airportCode);

  if (catalogAirport) {
    return catalogAirport;
  }

  const cityName = airport ? getDuffelPlaceCityName(airport) : airportCode;
  const aliases = [airport?.name, cityName, airport?.iata_code, fallbackCode]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  return {
    airportCode,
    airportName: airport?.name ?? `${airportCode} Airport`,
    cityName,
    countryCode: airport?.iata_country_code ?? "ZZ",
    searchAliases: Array.from(new Set(aliases)),
    timeZone: airport ? getDuffelPlaceTimeZone(airport) : "UTC"
  };
}

function summarizeBaggageQuantity(quantity: number, label: string) {
  if (quantity <= 0) {
    return `No ${label}`;
  }

  return `${quantity} ${label}${quantity === 1 ? "" : "s"}`;
}

function summarizeOfferBaggage(offer: DuffelOffer) {
  const baggages = offer.slices.flatMap((slice) =>
    slice.segments.flatMap((segment) => segment.passengers.flatMap((passenger) => passenger.baggages))
  );
  const cabinQuantity = baggages
    .filter((baggage) => baggage.type === "carry_on")
    .reduce((max, baggage) => Math.max(max, baggage.quantity), 0);
  const checkedQuantity = baggages
    .filter((baggage) => baggage.type === "checked")
    .reduce((max, baggage) => Math.max(max, baggage.quantity), 0);
  const baggageIncluded = checkedQuantity > 0;

  return {
    baggageIncluded,
    baggageSummary: {
      cabin: summarizeBaggageQuantity(cabinQuantity, "cabin bag"),
      checked: baggageIncluded
        ? summarizeBaggageQuantity(checkedQuantity, "checked bag")
        : "Checked baggage sold separately",
      notes: baggageIncluded
        ? "Carry-on and checked baggage allowance included in this fare."
        : "Carry-on allowance included. Checked baggage may cost extra."
    }
  };
}

function summarizeSegmentBaggage(
  baggages: DuffelOfferBaggage[] | undefined
) {
  if (!baggages || baggages.length === 0) {
    return undefined;
  }

  const cabinQuantity = baggages
    .filter((baggage) => baggage.type === "carry_on")
    .reduce((max, baggage) => Math.max(max, baggage.quantity), 0);
  const checkedQuantity = baggages
    .filter((baggage) => baggage.type === "checked")
    .reduce((max, baggage) => Math.max(max, baggage.quantity), 0);

  return {
    cabin: summarizeBaggageQuantity(cabinQuantity, "cabin bag"),
    checked: summarizeBaggageQuantity(checkedQuantity, "checked bag")
  };
}

function summarizeCondition(
  condition: DuffelFlightsCondition | null,
  allowedLabel: string,
  disallowedLabel: string,
  unknownLabel: string
) {
  if (!condition) {
    return unknownLabel;
  }

  if (!condition.allowed) {
    return disallowedLabel;
  }

  if (condition.penalty_amount && condition.penalty_currency) {
    return `${allowedLabel} with a ${condition.penalty_currency} ${condition.penalty_amount} penalty.`;
  }

  return `${allowedLabel} subject to airline fare rules.`;
}

function mapDuffelCabinClass(
  segment: DuffelOfferSegment,
  fallback: CabinClass
): CabinClass {
  const cabinClass = segment.passengers[0]?.cabin_class ?? fallback;

  switch (cabinClass) {
    case "economy":
    case "premium_economy":
    case "business":
    case "first":
      return cabinClass;
    default:
      return fallback;
  }
}

function buildFlightNumber(segment: DuffelOfferSegment) {
  const airlineCode = getAirlineCode(segment.marketing_carrier);

  if (airlineCode === "XX") {
    return segment.marketing_carrier_flight_number;
  }

  return airlineCode
    ? `${airlineCode}${segment.marketing_carrier_flight_number}`
    : segment.marketing_carrier_flight_number;
}

function mapDuffelSegment(
  segment: DuffelOfferSegment,
  fallbackCabinClass: CabinClass,
  fallbackRoute?: {
    destination?: string;
    origin?: string;
  }
): ProviderFlightSegment {
  return {
    aircraftCode: segment.aircraft?.iata_code ?? segment.aircraft?.name,
    arrivalAt: segment.arriving_at,
    baggageAllowance: summarizeSegmentBaggage(segment.passengers[0]?.baggages),
    cabinClass: mapDuffelCabinClass(segment, fallbackCabinClass),
    departureAt: segment.departing_at,
    destination: mapDuffelAirport(segment.destination, fallbackRoute?.destination),
    durationMinutes:
      parseIsoDurationToMinutes(segment.duration) ||
      differenceInMinutes(segment.departing_at, segment.arriving_at),
    fareClassCode: segment.passengers[0]?.fare_basis_code ?? undefined,
    flightNumber: buildFlightNumber(segment),
    marketingAirline: mapDuffelAirline(segment.marketing_carrier),
    operatingAirline: mapDuffelAirline(segment.operating_carrier),
    origin: mapDuffelAirport(segment.origin, fallbackRoute?.origin)
  };
}

function mapDuffelLeg(
  slice: DuffelOfferSlice,
  legIndex: number,
  fallbackCabinClass: CabinClass,
  criteria: FlightSearchCriteria
): ProviderFlightLeg {
  const fallbackRoute =
    criteria.tripType === "multi_city"
      ? criteria.multiCitySegments?.[legIndex - 1]
      : legIndex === 1
        ? {
            destination: criteria.destination,
            origin: criteria.origin
          }
        : {
            destination: criteria.origin,
            origin: criteria.destination
          };
  const segments = slice.segments.map((segment, segmentIndex) =>
    mapDuffelSegment(segment, fallbackCabinClass, {
      destination:
        segmentIndex === slice.segments.length - 1 ? fallbackRoute?.destination : undefined,
      origin: segmentIndex === 0 ? fallbackRoute?.origin : undefined
    })
  );

  return {
    arrivalAt: segments[segments.length - 1]?.arrivalAt ?? new Date().toISOString(),
    departureAt: segments[0]?.departureAt ?? new Date().toISOString(),
    destination:
      segments[segments.length - 1]?.destination ??
      mapDuffelAirport(slice.destination, fallbackRoute?.destination),
    durationMinutes:
      parseIsoDurationToMinutes(slice.duration) ||
      differenceInMinutes(
        segments[0]?.departureAt ?? new Date().toISOString(),
        segments[segments.length - 1]?.arrivalAt ?? new Date().toISOString()
      ),
    legIndex,
    origin: segments[0]?.origin ?? mapDuffelAirport(slice.origin, fallbackRoute?.origin),
    segments
  };
}

function buildDuffelPassengers(criteria: FlightSearchCriteria): DuffelPassenger[] {
  const adults = Array.from({length: criteria.adults}, () => ({
    type: "adult" as const
  }));
  const children = Array.from({length: criteria.children}, () => ({
    age: 11
  }));
  const infants = Array.from({length: criteria.infants}, () => ({
    age: 1
  }));

  return [...adults, ...children, ...infants];
}

function mapDuffelOffer(
  offer: DuffelOffer,
  criteria: FlightSearchCriteria,
  context: ProviderFlightSearchContext
): ProviderFlightOffer {
  const currency = coerceSupportedCurrency(offer.total_currency, criteria.currency);
  const legs = offer.slices.map((slice, index) =>
    mapDuffelLeg(slice, index + 1, criteria.cabinClass, criteria)
  );
  const firstSlice = offer.slices[0];
  const defaultCabinClass =
    firstSlice?.segments[0] ? mapDuffelCabinClass(firstSlice.segments[0], criteria.cabinClass) : criteria.cabinClass;
  const {baggageIncluded, baggageSummary} = summarizeOfferBaggage(offer);
  const totalDurationMinutes = legs.reduce((total, leg) => total + leg.durationMinutes, 0);
  const stopCount = Math.max((firstSlice?.segments.length ?? 1) - 1, 0);
  const taxAmountMinor =
    offer.tax_amount != null
      ? toMinorAmount(offer.tax_amount, currency)
      : Math.max(
          toMinorAmount(offer.total_amount, currency) - toMinorAmount(offer.base_amount, currency),
          0
        );
  const airlineLogos = Array.from(
    new Map(
      offer.slices
        .flatMap((slice) => slice.segments)
        .map((segment) => {
          const airline = segment.marketing_carrier;
          const code = getAirlineCode(airline);

          return [
            code,
            {
              code,
              logoUrl: airline?.logo_symbol_url ?? airline?.logo_lockup_url,
              name: airline?.name ?? "Airline pending confirmation"
            }
          ] as const;
        })
    ).values()
  );

  return {
    baggageIncluded,
    baggageSummary,
    baseAmountMinor: toMinorAmount(offer.base_amount, currency),
    cabinClass: defaultCabinClass,
    currency,
    expiresAt: offer.expires_at,
    fareConditions: {
      cancellationSummary: summarizeCondition(
        offer.conditions.refund_before_departure,
        "Refundable before departure",
        "Non-refundable after ticketing",
        "Refundability depends on airline fare rules"
      ),
      changeSummary: summarizeCondition(
        offer.conditions.change_before_departure,
        "Changes allowed before departure",
        "Changes are not allowed before departure",
        "Changeability depends on airline fare rules"
      ),
      changeable: offer.conditions.change_before_departure?.allowed ?? false,
      refundable: offer.conditions.refund_before_departure?.allowed ?? false,
      ticketingDeadlineAt: offer.expires_at
    },
    legs,
    metadata: {
      airlineLogos,
      offerOwner: {
        code: getAirlineCode(offer.owner),
        logoUrl: offer.owner?.logo_symbol_url ?? offer.owner?.logo_lockup_url,
        name: offer.owner?.name ?? "Airline pending confirmation"
      },
      providerLabel: "Duffel",
      requestedRoute: `${context.origin.airportCode}-${context.destination.airportCode}`
    },
    passengerCounts: {
      adults: criteria.adults,
      children: criteria.children,
      infants: criteria.infants
    },
    searchHash: context.searchHash,
    stopCount,
    supplierOfferId: offer.id,
    taxAmountMinor,
    totalAmountMinor: toMinorAmount(offer.total_amount, currency),
    totalDurationMinutes,
    tripType: criteria.tripType
  };
}

export async function searchDuffelFlights(
  criteria: FlightSearchCriteria,
  context: ProviderFlightSearchContext
) {
  const slices =
    criteria.tripType === "multi_city" && criteria.multiCitySegments?.length
      ? criteria.multiCitySegments.map((segment) => ({
          arrival_time: null,
          departure_date: segment.departureDate,
          departure_time: null,
          destination: segment.destination,
          origin: segment.origin
        }))
      : [
          {
            arrival_time: null,
            departure_date: criteria.departureDate,
            departure_time: null,
            destination: context.destination.airportCode,
            origin: context.origin.airportCode
          },
          ...(criteria.tripType === "round_trip" && criteria.returnDate
            ? [
                {
                  arrival_time: null,
                  departure_date: criteria.returnDate,
                  departure_time: null,
                  destination: context.origin.airportCode,
                  origin: context.destination.airportCode
                }
              ]
            : [])
        ];
  const offerRequestResponse = await duffel.offerRequests.create({
    cabin_class: criteria.cabinClass,
    passengers: buildDuffelPassengers(criteria),
    return_offers: false,
    slices,
    supplier_timeout: 20_000
  });
  const offersResponse = await duffel.offers.list({
    max_connections: 2,
    offer_request_id: offerRequestResponse.data.id,
    sort: "total_amount"
  });

  return offersResponse.data.map((offer) => mapDuffelOffer(offer, criteria, context));
}

export const duffelFlightOfferProvider: FlightOfferProvider = {
  code: "duffel",
  search: searchDuffelFlights
};
