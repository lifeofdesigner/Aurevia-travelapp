import {type NormalizedFlightOffer} from "@/features/flights/types";

import {type ProviderFlightOffer} from "./types";

export function mapProviderOfferToNormalizedOffer(
  providerCode: string,
  offer: ProviderFlightOffer
): NormalizedFlightOffer {
  const firstLeg = offer.legs[0];
  const firstSegment = firstLeg.segments[0];
  const outboundFinalSegment = firstLeg.segments[firstLeg.segments.length - 1];
  const lastLeg = offer.legs[offer.legs.length - 1];
  const finalSegment = lastLeg.segments[lastLeg.segments.length - 1];
  const returnLeg = offer.tripType === "round_trip" ? offer.legs[1] : undefined;
  const airlines = Array.from(
    new Map(
      offer.legs
        .flatMap((leg) => leg.segments)
        .map((segment) => [
          segment.marketingAirline.code,
          segment.marketingAirline.name
        ])
    ).entries()
  );

  return {
    airlineCodes: airlines.map(([code]) => code),
    airlineNames: airlines.map(([, name]) => name),
    baggageIncluded: offer.baggageIncluded,
    baggageSummary: offer.baggageSummary,
    baseAmount: {
      amountMinor: offer.baseAmountMinor,
      currency: offer.currency
    },
    cabinClass: offer.cabinClass,
    departureDate: firstSegment.departureAt.slice(0, 10),
    destinationAirportCode: outboundFinalSegment.destination.airportCode,
    destinationAirportName: outboundFinalSegment.destination.airportName,
    destinationCityName: outboundFinalSegment.destination.cityName,
    expiresAt: offer.expiresAt,
    fareConditions: offer.fareConditions,
    id: offer.supplierOfferId,
    legs: offer.legs.map((leg) => ({
      arrivalAt: leg.arrivalAt,
      departureAt: leg.departureAt,
      destinationAirportCode: leg.destination.airportCode,
      durationMinutes: leg.durationMinutes,
      legIndex: leg.legIndex,
      originAirportCode: leg.origin.airportCode,
      segments: leg.segments.map((segment, index) => ({
        aircraftCode: segment.aircraftCode,
        arrivalAt: segment.arrivalAt,
        baggageAllowance: segment.baggageAllowance,
        cabinClass: segment.cabinClass,
        departureAt: segment.departureAt,
        destinationAirportCode: segment.destination.airportCode,
        destinationAirportName: segment.destination.airportName,
        destinationCityName: segment.destination.cityName,
        destinationTimeZone: segment.destination.timeZone,
        durationMinutes: segment.durationMinutes,
        fareClassCode: segment.fareClassCode,
        flightNumber: segment.flightNumber,
        marketingAirlineCode: segment.marketingAirline.code,
        marketingAirlineName: segment.marketingAirline.name,
        operatingAirlineCode: segment.operatingAirline?.code,
        operatingAirlineName: segment.operatingAirline?.name,
        originAirportCode: segment.origin.airportCode,
        originAirportName: segment.origin.airportName,
        originCityName: segment.origin.cityName,
        originTimeZone: segment.origin.timeZone,
        segmentId: `${offer.supplierOfferId}-${leg.legIndex}-${index + 1}`
      })),
      stopCount: Math.max(leg.segments.length - 1, 0)
    })),
    metadata: offer.metadata,
    originAirportCode: firstSegment.origin.airportCode,
    originAirportName: firstSegment.origin.airportName,
    originCityName: firstSegment.origin.cityName,
    passengerCounts: offer.passengerCounts,
    refundable: offer.fareConditions.refundable,
    returnDate:
      returnLeg?.departureAt.slice(0, 10),
    searchHash: offer.searchHash,
    stopCount: offer.stopCount,
    supplierCode: providerCode,
    supplierOfferId: offer.supplierOfferId,
    taxAmount: {
      amountMinor: offer.taxAmountMinor,
      currency: offer.currency
    },
    totalAmount: {
      amountMinor: offer.totalAmountMinor,
      currency: offer.currency
    },
    totalDurationMinutes: offer.totalDurationMinutes,
    tripType: offer.tripType
  };
}
