import {type SupportedCurrency} from "@/lib/money";

import {type HotelSearchCriteria, type HotelRoomOption, type NormalizedHotelOffer} from "@/features/hotels/types";
import {differenceInCalendarDays} from "@/features/hotels/lib/results";

import {type MockHotelCatalogProperty} from "./catalog";
import {type ProviderHotelSearchContext} from "./types";

const currencyRates: Record<SupportedCurrency, number> = {
  AED: 3.97,
  EUR: 1,
  GBP: 0.86,
  NGN: 1685,
  USD: 1.08
};

function convertFromEur(amountMinor: number, currency: SupportedCurrency) {
  return Math.round(amountMinor * currencyRates[currency]);
}

function getSeasonalMultiplier(checkIn: string) {
  const date = new Date(`${checkIn}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if ([6, 7, 8, 12].includes(month)) {
    return 1.12;
  }

  if (day >= 20 && day <= 25) {
    return 1.06;
  }

  return 1;
}

function buildRoomOption(
  property: MockHotelCatalogProperty,
  roomTemplate: MockHotelCatalogProperty["roomTemplates"][number],
  criteria: HotelSearchCriteria,
  searchHash: string,
  supplierCode: string
): HotelRoomOption {
  const nightCount = differenceInCalendarDays(criteria.checkIn, criteria.checkOut);
  const seasonalMultiplier = getSeasonalMultiplier(criteria.checkIn);
  const eurSubtotal = Math.round(
    roomTemplate.nightlyRateEurMinor * nightCount * criteria.rooms * seasonalMultiplier
  );
  const eurTax = Math.round(eurSubtotal * 0.2);
  const eurTotal = eurSubtotal + eurTax;
  const supplierOfferId = [
    supplierCode,
    property.propertyCode,
    roomTemplate.roomCode,
    criteria.checkIn,
    criteria.checkOut,
    criteria.rooms,
    criteria.guests
  ].join(":");

  return {
    amenities: roomTemplate.amenities,
    bedsSummary: roomTemplate.bedsSummary,
    breakfastIncluded: roomTemplate.breakfastIncluded,
    cancellationSummary: roomTemplate.cancellationSummary,
    description: roomTemplate.description,
    guestCapacity: roomTemplate.guestCapacity * criteria.rooms,
    imageUrl: roomTemplate.imageUrl,
    offerId: supplierOfferId,
    quantity: criteria.rooms,
    rateType: roomTemplate.rateType,
    refundable: roomTemplate.refundable,
    roomCode: roomTemplate.roomCode,
    roomName: roomTemplate.roomName,
    sizeSqm: roomTemplate.sizeSqm,
    subtotalAmount: {
      amountMinor: convertFromEur(eurSubtotal, criteria.currency),
      currency: criteria.currency
    },
    supplierOfferId,
    taxAmount: {
      amountMinor: convertFromEur(eurTax, criteria.currency),
      currency: criteria.currency
    },
    totalAmount: {
      amountMinor: convertFromEur(eurTotal, criteria.currency),
      currency: criteria.currency
    }
  };
}

export function mapMockHotelPropertyToOffer(
  property: MockHotelCatalogProperty,
  criteria: HotelSearchCriteria,
  context: ProviderHotelSearchContext,
  supplierCode: string
): NormalizedHotelOffer | null {
  const roomOptions = property.roomTemplates
    .filter((roomTemplate) => criteria.guests <= roomTemplate.guestCapacity * criteria.rooms)
    .map((roomTemplate) =>
      buildRoomOption(property, roomTemplate, criteria, context.searchHash, supplierCode)
    )
    .sort((left, right) => left.totalAmount.amountMinor - right.totalAmount.amountMinor);

  if (roomOptions.length === 0) {
    return null;
  }

  return {
    addressLine: property.addressLine,
    amenities: property.amenities,
    breakfastIncluded: roomOptions.some((roomOption) => roomOption.breakfastIncluded),
    checkIn: criteria.checkIn,
    checkOut: criteria.checkOut,
    cheapestSubtotalAmount: roomOptions[0].subtotalAmount,
    cheapestTaxAmount: roomOptions[0].taxAmount,
    cheapestTotalAmount: roomOptions[0].totalAmount,
    cityId: context.destination.cityId,
    cityName: property.cityName,
    countryCode: property.countryCode,
    countryName: property.countryName,
    description: property.description,
    featuredTags: property.featuredTags,
    guestCount: criteria.guests,
    guestRating: property.guestRating,
    id: roomOptions[0].offerId,
    images: property.images,
    latitude: property.latitude,
    longitude: property.longitude,
    neighborhood: property.neighborhood,
    nightCount: differenceInCalendarDays(criteria.checkIn, criteria.checkOut),
    policies: property.policies,
    propertyCode: property.propertyCode,
    propertyName: property.propertyName,
    propertyType: property.propertyType,
    refundable: roomOptions.some((roomOption) => roomOption.refundable),
    reviewCount: property.reviewCount,
    roomCount: criteria.rooms,
    roomOptions,
    searchHash: context.searchHash,
    starRating: property.starRating,
    supplierCode
  };
}
