import {type SupportedCurrency} from "@/lib/money";
import {type CarSearchCriteria, type NormalizedCarOffer} from "@/features/cars/types";

import {type MockCarInventoryItem} from "./catalog";
import {type ProviderCarSearchContext} from "./types";

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

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00Z`).toISOString();
}

function getRentalHours(criteria: CarSearchCriteria) {
  const pickupAt = new Date(combineDateTime(criteria.pickupDate, criteria.pickupTime));
  const dropoffAt = new Date(combineDateTime(criteria.dropoffDate, criteria.dropoffTime));

  return Math.max(
    24,
    Math.round((dropoffAt.getTime() - pickupAt.getTime()) / (1000 * 60 * 60))
  );
}

export function mapMockCarOffer(
  inventoryItem: MockCarInventoryItem,
  criteria: CarSearchCriteria,
  context: ProviderCarSearchContext,
  supplierCode: string
): NormalizedCarOffer {
  const rentalHours = getRentalHours(criteria);
  const rentalDays = Math.ceil(rentalHours / 24);
  const airportFee = context.pickupLocation.isAirport || context.dropoffLocation.isAirport ? 1800 : 0;
  const oneWayFee =
    context.pickupLocation.cityId !== context.dropoffLocation.cityId ? 2400 : 0;
  const youngDriverFee = criteria.driverAge < 25 ? 1600 * rentalDays : 0;
  const eurSubtotal =
    inventoryItem.baseDailyRateEurMinor * rentalDays + airportFee + oneWayFee + youngDriverFee;
  const eurTax = Math.round(eurSubtotal * 0.2);
  const supplierOfferId = [
    supplierCode,
    inventoryItem.vendorCode,
    inventoryItem.vehicleName.replace(/\s+/gu, "-").toLowerCase(),
    criteria.pickupDate,
    criteria.dropoffDate,
    criteria.driverAge
  ].join(":");

  return {
    bagCount: inventoryItem.bagCount,
    currency: criteria.currency,
    doorCount: inventoryItem.doorCount,
    driverAgeMin: inventoryItem.driverAgeMin,
    dropoffAirportCode: context.dropoffLocation.airportCode,
    dropoffAt: combineDateTime(criteria.dropoffDate, criteria.dropoffTime),
    dropoffCityId: context.dropoffLocation.cityId,
    dropoffLocationLabel: context.dropoffLocation.defaultLabel,
    fuelPolicy: inventoryItem.fuelPolicy,
    fuelType: inventoryItem.fuelType,
    highlights: inventoryItem.highlights,
    id: supplierOfferId,
    imageUrl: inventoryItem.imageUrl,
    insuranceSummary: inventoryItem.insuranceSummary,
    mileagePolicy: inventoryItem.mileagePolicy,
    pickupAirportCode: context.pickupLocation.airportCode,
    pickupAt: combineDateTime(criteria.pickupDate, criteria.pickupTime),
    pickupCityId: context.pickupLocation.cityId,
    pickupLocationLabel: context.pickupLocation.defaultLabel,
    rentalTermsSummary: inventoryItem.rentalTermsSummary,
    searchHash: context.searchHash,
    seatCount: inventoryItem.seatCount,
    subtotalAmount: {
      amountMinor: convertFromEur(eurSubtotal, criteria.currency),
      currency: criteria.currency
    },
    supplierCode,
    supplierOfferId,
    taxAmount: {
      amountMinor: convertFromEur(eurTax, criteria.currency),
      currency: criteria.currency
    },
    totalAmount: {
      amountMinor: convertFromEur(eurSubtotal + eurTax, criteria.currency),
      currency: criteria.currency
    },
    transmissionType: inventoryItem.transmissionType,
    vehicleCategory: inventoryItem.vehicleCategory,
    vehicleName: inventoryItem.vehicleName,
    vendorCode: inventoryItem.vendorCode,
    vendorName: inventoryItem.vendorName
  };
}
