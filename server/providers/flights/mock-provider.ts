import {toMinorUnit, type SupportedCurrency} from "@/lib/money";
import {CABIN_CLASSES, type CabinClass} from "@/types/database-enums";

import {type FlightSearchCriteria} from "@/features/flights/types";

import {
  getMockAirlineByCode,
  getMockAirportByCode,
  getMockRouteDurationMinutes,
  listMockHubAirports
} from "./catalog";
import {type FlightOfferProvider, type ProviderFlightOffer, type ProviderFlightSearchContext} from "./types";

const supplierAirlineRotations = [
  ["OS", "BA"],
  ["EK", "OS"],
  ["BA", "DL"],
  ["P4", "EK"],
  ["DL", "BA"],
  ["OS", "EK"]
] as const;

const cabinPriceMultipliers: Record<CabinClass, number> = {
  economy: 1,
  premium_economy: 1.45,
  business: 2.25,
  first: 3.4
};

const upsellCabinMatrix: Record<CabinClass, CabinClass[]> = {
  economy: ["economy", "premium_economy", "business"],
  premium_economy: ["premium_economy", "business"],
  business: ["business", "first"],
  first: ["first"]
};

const currencyMultipliers: Record<SupportedCurrency, number> = {
  AED: 3.97,
  EUR: 1,
  GBP: 0.86,
  NGN: 1685,
  USD: 1.08
};

function addMinutes(dateTime: Date, minutes: number) {
  return new Date(dateTime.getTime() + minutes * 60_000);
}

function buildDateTime(date: string, hours: number, minutes: number) {
  return new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`);
}

function getCabinRotation(requestedCabin: CabinClass, index: number) {
  const availableCabins = upsellCabinMatrix[requestedCabin];
  return availableCabins[index % availableCabins.length] ?? requestedCabin;
}

function convertEurAmount(amountMajor: number, currency: SupportedCurrency) {
  return toMinorUnit(amountMajor * currencyMultipliers[currency], currency);
}

function buildFlightNumber(airlineCode: string, index: number) {
  return `${airlineCode}${600 + index * 7}`;
}

function createLegSegments(
  originAirportCode: string,
  destinationAirportCode: string,
  travelDate: string,
  departureHours: number,
  departureMinutes: number,
  stopCount: number,
  cabinClass: CabinClass,
  airlineCodes: readonly string[],
  legIndex: number
) {
  const origin = getMockAirportByCode(originAirportCode);
  const destination = getMockAirportByCode(destinationAirportCode);

  if (!origin || !destination) {
    throw new Error("Mock flight provider could not resolve an airport for the requested route.");
  }

  const baseDeparture = buildDateTime(travelDate, departureHours, departureMinutes);
  const directDurationMinutes = getMockRouteDurationMinutes(originAirportCode, destinationAirportCode);

  if (stopCount === 0) {
    const airline = getMockAirlineByCode(airlineCodes[0]) ?? getMockAirlineByCode("OS");

    if (!airline) {
      throw new Error("Mock flight provider is missing airline data.");
    }

    return [
      {
        aircraftCode: directDurationMinutes > 480 ? "789" : "320",
        arrivalAt: addMinutes(baseDeparture, directDurationMinutes).toISOString(),
        baggageAllowance: {
          cabin: "1 cabin bag",
          checked: cabinClass === "economy" ? "23kg checked bag" : "32kg checked bag"
        },
        cabinClass,
        departureAt: baseDeparture.toISOString(),
        destination,
        durationMinutes: directDurationMinutes,
        fareClassCode: cabinClass === "business" ? "J" : "Y",
        flightNumber: buildFlightNumber(airline.code, legIndex),
        marketingAirline: airline,
        origin
      }
    ];
  }

  const hubAirports = listMockHubAirports(originAirportCode, destinationAirportCode);
  const hub = hubAirports[(legIndex + stopCount) % hubAirports.length];
  const firstAirline = getMockAirlineByCode(airlineCodes[0]) ?? getMockAirlineByCode("OS");
  const secondAirline = getMockAirlineByCode(airlineCodes[1] ?? airlineCodes[0]) ?? firstAirline;

  if (!hub || !firstAirline || !secondAirline) {
    throw new Error("Mock flight provider could not build a connecting route.");
  }

  const firstDuration = Math.max(Math.round(directDurationMinutes * 0.44), 95);
  const layoverMinutes = 95 + legIndex * 10;
  const secondDuration = Math.max(directDurationMinutes - firstDuration + 65, 110);
  const secondDeparture = addMinutes(baseDeparture, firstDuration + layoverMinutes);

  return [
    {
      aircraftCode: "320",
      arrivalAt: addMinutes(baseDeparture, firstDuration).toISOString(),
      baggageAllowance: {
        cabin: "1 cabin bag",
        checked: "23kg checked bag"
      },
      cabinClass,
      departureAt: baseDeparture.toISOString(),
      destination: hub,
      durationMinutes: firstDuration,
      fareClassCode: cabinClass === "business" ? "C" : "Y",
      flightNumber: buildFlightNumber(firstAirline.code, legIndex),
      marketingAirline: firstAirline,
      origin
    },
    {
      aircraftCode: secondDuration > 480 ? "777" : "321",
      arrivalAt: addMinutes(secondDeparture, secondDuration).toISOString(),
      baggageAllowance: {
        cabin: "1 cabin bag",
        checked: cabinClass === "economy" ? "23kg checked bag" : "32kg checked bag"
      },
      cabinClass,
      departureAt: secondDeparture.toISOString(),
      destination,
      durationMinutes: secondDuration,
      fareClassCode: cabinClass === "business" ? "J" : "M",
      flightNumber: buildFlightNumber(secondAirline.code, legIndex + 1),
      marketingAirline: secondAirline,
      origin: hub
    }
  ];
}

function sumSegmentDuration(segments: ReturnType<typeof createLegSegments>) {
  if (segments.length === 0) {
    return 0;
  }

  return (
    segments.reduce((total, segment) => total + segment.durationMinutes, 0) +
    Math.max(
      Math.round(
        (new Date(segments[segments.length - 1].arrivalAt).getTime() -
          new Date(segments[0].departureAt).getTime()) /
          60_000
      ) - segments.reduce((total, segment) => total + segment.durationMinutes, 0),
      0
    )
  );
}

function buildPricing(
  criteria: FlightSearchCriteria,
  cabinClass: CabinClass,
  stopCount: number,
  refundable: boolean,
  baggageIncluded: boolean,
  totalDurationMinutes: number
) {
  const routeDurationFactor = Math.max(totalDurationMinutes / 60, 2.5);
  const routeBaseEur = 85 + routeDurationFactor * 22;
  const stopAdjustment = stopCount === 0 ? 90 : stopCount === 1 ? 20 : -15;
  const baggageAdjustment = baggageIncluded ? 24 : 0;
  const refundableAdjustment = refundable ? 58 : 0;
  const cabinMultiplier = cabinPriceMultipliers[cabinClass];
  const perAdultEur =
    (routeBaseEur + stopAdjustment + baggageAdjustment + refundableAdjustment) *
    cabinMultiplier;
  const passengerUnits =
    criteria.adults + criteria.children * 0.72 + criteria.infants * 0.14;
  const subtotalEur = perAdultEur * passengerUnits;
  const taxEur = subtotalEur * 0.18;
  const totalEur = subtotalEur + taxEur;

  return {
    baseAmountMinor: convertEurAmount(subtotalEur, criteria.currency),
    taxAmountMinor: convertEurAmount(taxEur, criteria.currency),
    totalAmountMinor: convertEurAmount(totalEur, criteria.currency)
  };
}

function buildProviderLeg({
  airlineCodes,
  cabinClass,
  departureHours,
  departureMinutes,
  destinationAirportCode,
  legIndex,
  originAirportCode,
  stopCount,
  travelDate
}: {
  airlineCodes: readonly string[];
  cabinClass: CabinClass;
  departureHours: number;
  departureMinutes: number;
  destinationAirportCode: string;
  legIndex: number;
  originAirportCode: string;
  stopCount: number;
  travelDate: string;
}) {
  const origin = getMockAirportByCode(originAirportCode);
  const destination = getMockAirportByCode(destinationAirportCode);

  if (!origin || !destination) {
    throw new Error("Mock flight provider could not resolve a multi-city route.");
  }

  const segments = createLegSegments(
    originAirportCode,
    destinationAirportCode,
    travelDate,
    departureHours,
    departureMinutes,
    stopCount,
    cabinClass,
    airlineCodes,
    legIndex
  );

  return {
    arrivalAt: segments[segments.length - 1].arrivalAt,
    departureAt: segments[0].departureAt,
    destination,
    durationMinutes: sumSegmentDuration(segments),
    legIndex,
    origin,
    segments
  };
}

export class MockFlightOfferProvider implements FlightOfferProvider {
  code = "mock-flights-core";
  requiresCatalogLocations = true;

  async search(
    criteria: FlightSearchCriteria,
    context: ProviderFlightSearchContext
  ): Promise<ProviderFlightOffer[]> {
    const offers: ProviderFlightOffer[] = [];

    for (let index = 0; index < 8; index += 1) {
      const tripType = criteria.tripType;
      const stopCount = index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : 0;
      const outboundCabin = getCabinRotation(criteria.cabinClass, index);
      const airlineCodes = supplierAirlineRotations[index % supplierAirlineRotations.length];
      const refundable = index % 2 === 0;
      const baggageIncluded = index % 4 !== 3;
      const outboundSegments = createLegSegments(
        context.origin.airportCode,
        context.destination.airportCode,
        criteria.departureDate,
        6 + (index % 4) * 4,
        index % 2 === 0 ? 15 : 45,
        stopCount,
        outboundCabin,
        airlineCodes,
        index + 1
      );
      const outboundLeg = {
        arrivalAt: outboundSegments[outboundSegments.length - 1].arrivalAt,
        departureAt: outboundSegments[0].departureAt,
        destination: context.destination,
        durationMinutes: sumSegmentDuration(outboundSegments),
        legIndex: 1,
        origin: context.origin,
        segments: outboundSegments
      };
      const multiCityLegs =
        tripType === "multi_city" && criteria.multiCitySegments?.length
          ? criteria.multiCitySegments.map((segment, segmentIndex) =>
              buildProviderLeg({
                airlineCodes,
                cabinClass: outboundCabin,
                departureHours: 6 + ((index + segmentIndex) % 4) * 4,
                departureMinutes: (index + segmentIndex) % 2 === 0 ? 15 : 45,
                destinationAirportCode: segment.destination,
                legIndex: segmentIndex + 1,
                originAirportCode: segment.origin,
                stopCount: segmentIndex === 0 ? stopCount : stopCount === 0 ? 0 : 1,
                travelDate: segment.departureDate
              })
            )
          : null;
      const returnSegments =
        !multiCityLegs && tripType === "round_trip" && criteria.returnDate
          ? createLegSegments(
              context.destination.airportCode,
              context.origin.airportCode,
              criteria.returnDate,
              7 + (index % 4) * 3,
              index % 2 === 0 ? 10 : 40,
              stopCount === 0 ? 0 : 1,
              outboundCabin,
              airlineCodes.slice().reverse(),
              index + 9
            )
          : [];
      const legs = [
        ...(multiCityLegs ?? [outboundLeg]),
        ...(returnSegments.length > 0
          ? [
              {
                arrivalAt: returnSegments[returnSegments.length - 1].arrivalAt,
                departureAt: returnSegments[0].departureAt,
                destination: context.origin,
                durationMinutes: sumSegmentDuration(returnSegments),
                legIndex: 2,
                origin: context.destination,
                segments: returnSegments
              }
            ]
          : [])
      ];
      const totalDurationMinutes = legs.reduce(
        (total, leg) => total + leg.durationMinutes,
        0
      );
      const pricing = buildPricing(
        criteria,
        outboundCabin,
        stopCount,
        refundable,
        baggageIncluded,
        totalDurationMinutes
      );

      offers.push({
        baggageIncluded,
        baggageSummary: {
          cabin: "1 cabin bag",
          checked: baggageIncluded
            ? outboundCabin === "economy"
              ? "23kg checked bag"
              : "32kg checked bag"
            : "Checked bag available at checkout",
          notes: baggageIncluded ? "Cabin and checked baggage included." : "Checked baggage sold separately."
        },
        baseAmountMinor: pricing.baseAmountMinor,
        cabinClass: outboundCabin,
        currency: criteria.currency,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        fareConditions: {
          cancellationSummary: refundable
            ? "Refundable with a fare difference and service fee."
            : "Non-refundable after ticketing.",
          changeSummary: refundable
            ? "Changes permitted before departure."
            : "Changes permitted with penalties.",
          changeable: true,
          refundable,
          ticketingDeadlineAt: new Date(Date.now() + 8 * 60 * 60_000).toISOString()
        },
        legs,
        metadata: {
          providerLabel: "Mock Flights Core",
          serviceClassSet: CABIN_CLASSES,
          routeHint: `${context.origin.airportCode}-${context.destination.airportCode}`
        },
        passengerCounts: {
          adults: criteria.adults,
          children: criteria.children,
          infants: criteria.infants
        },
        searchHash: context.searchHash,
        stopCount,
        supplierOfferId: `${context.searchHash}-${index + 1}`,
        taxAmountMinor: pricing.taxAmountMinor,
        totalAmountMinor: pricing.totalAmountMinor,
        totalDurationMinutes,
        tripType
      });
    }

    return offers;
  }
}
