import {CABIN_CLASSES, type CabinClass} from "@/types/database-enums";

import {
  type FlightResultsFilters,
  type FlightResultsMetadata,
  type FlightTimeWindow,
  type NormalizedFlightOffer
} from "../types";

export function getTimeWindowKey(dateTime: string, timeZone: string): FlightTimeWindow {
  const formattedHour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone
  }).format(new Date(dateTime));
  const hour = Number(formattedHour);

  if (hour < 6) {
    return "overnight";
  }

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

export function buildFlightResultsMetadata(
  offers: NormalizedFlightOffer[]
): FlightResultsMetadata {
  if (offers.length === 0) {
    return {
      airlines: [],
      cabins: [],
      maxPriceMinor: 0,
      minPriceMinor: 0
    };
  }

  const airlineMap = new Map<string, {code: string; count: number; name: string}>();
  const cabins = new Set<CabinClass>();
  let minPriceMinor = offers[0].totalAmount.amountMinor;
  let maxPriceMinor = offers[0].totalAmount.amountMinor;

  for (const offer of offers) {
    cabins.add(offer.cabinClass);
    minPriceMinor = Math.min(minPriceMinor, offer.totalAmount.amountMinor);
    maxPriceMinor = Math.max(maxPriceMinor, offer.totalAmount.amountMinor);

    offer.airlineCodes.forEach((code, index) => {
      const existing = airlineMap.get(code);

      if (existing) {
        existing.count += 1;
        return;
      }

      airlineMap.set(code, {
        code,
        count: 1,
        name: offer.airlineNames[index] ?? code
      });
    });
  }

  return {
    airlines: Array.from(airlineMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    cabins: CABIN_CLASSES.filter((cabin) => cabins.has(cabin)),
    maxPriceMinor,
    minPriceMinor
  };
}

export function applyFlightResultsFilters(
  offers: NormalizedFlightOffer[],
  filters: FlightResultsFilters
) {
  return offers.filter((offer) => {
    const departureWindow = getTimeWindowKey(
      offer.legs[0]?.departureAt ?? offer.departureDate,
      offer.legs[0]?.segments[0]?.originTimeZone ?? "UTC"
    );
    const finalLeg = offer.legs[offer.legs.length - 1];
    const finalSegment = finalLeg?.segments[finalLeg.segments.length - 1];
    const arrivalWindow = finalSegment
      ? getTimeWindowKey(finalSegment.arrivalAt, finalSegment.destinationTimeZone)
      : "morning";

    if (filters.airlines.length > 0) {
      const hasMatchingAirline = offer.airlineCodes.some((code) =>
        filters.airlines.includes(code)
      );

      if (!hasMatchingAirline) {
        return false;
      }
    }

    if (filters.stops.length > 0 && !filters.stops.includes(Math.min(offer.stopCount, 2))) {
      return false;
    }

    if (
      filters.departureWindows.length > 0 &&
      !filters.departureWindows.includes(departureWindow)
    ) {
      return false;
    }

    if (
      filters.arrivalWindows.length > 0 &&
      !filters.arrivalWindows.includes(arrivalWindow)
    ) {
      return false;
    }

    if (
      typeof filters.priceMin === "number" &&
      offer.totalAmount.amountMinor < filters.priceMin
    ) {
      return false;
    }

    if (
      typeof filters.priceMax === "number" &&
      offer.totalAmount.amountMinor > filters.priceMax
    ) {
      return false;
    }

    if (filters.cabins.length > 0 && !filters.cabins.includes(offer.cabinClass)) {
      return false;
    }

    if (filters.refundable && !offer.refundable) {
      return false;
    }

    if (filters.baggageIncluded && !offer.baggageIncluded) {
      return false;
    }

    return true;
  });
}

export function sortFlightOffers(
  offers: NormalizedFlightOffer[],
  sort: FlightResultsFilters["sort"]
) {
  const sorted = [...offers];

  sorted.sort((left, right) => {
    if (sort === "price_asc") {
      return left.totalAmount.amountMinor - right.totalAmount.amountMinor;
    }

    if (sort === "duration_asc") {
      return left.totalDurationMinutes - right.totalDurationMinutes;
    }

    if (sort === "departure_asc") {
      return (
        new Date(left.legs[0]?.departureAt ?? left.departureDate).getTime() -
        new Date(right.legs[0]?.departureAt ?? right.departureDate).getTime()
      );
    }

    if (sort === "arrival_asc") {
      const leftArrival =
        left.legs[left.legs.length - 1]?.segments[
          left.legs[left.legs.length - 1]?.segments.length - 1
        ]?.arrivalAt ?? left.departureDate;
      const rightArrival =
        right.legs[right.legs.length - 1]?.segments[
          right.legs[right.legs.length - 1]?.segments.length - 1
        ]?.arrivalAt ?? right.departureDate;

      return new Date(leftArrival).getTime() - new Date(rightArrival).getTime();
    }

    const leftScore =
      left.totalAmount.amountMinor + left.stopCount * 25_00 + left.totalDurationMinutes * 4;
    const rightScore =
      right.totalAmount.amountMinor + right.stopCount * 25_00 + right.totalDurationMinutes * 4;

    return leftScore - rightScore;
  });

  return sorted;
}
