import {type SupportedCurrency} from "@/lib/money";
import {type NormalizedTransferOffer, type TransferSearchCriteria} from "@/features/transfers/types";

import {type MockTransferInventoryItem} from "./catalog";
import {type ProviderTransferSearchContext} from "./types";

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

export function mapMockTransferOffer(
  inventoryItem: MockTransferInventoryItem,
  criteria: TransferSearchCriteria,
  context: ProviderTransferSearchContext,
  supplierCode: string
): NormalizedTransferOffer {
  const airportFee = context.airportLocation ? 1600 : 0;
  const meetAndGreetFee = criteria.meetAndGreet ? 900 : 0;
  const luggageFee = criteria.luggageCount > 4 ? 700 : 0;
  const passengerFee = criteria.passengerCount > 3 ? 1200 : 0;
  const eurSubtotal =
    inventoryItem.basePriceEurMinor + airportFee + meetAndGreetFee + luggageFee + passengerFee;
  const eurTax = Math.round(eurSubtotal * 0.2);
  const supplierOfferId = [
    supplierCode,
    inventoryItem.vehicleClass,
    criteria.routeMode,
    criteria.pickupDate,
    criteria.pickupTime,
    criteria.passengerCount,
    criteria.luggageCount
  ].join(":");

  return {
    airportCode: context.airportLocation?.airportCode,
    dropoffAirportCode:
      criteria.routeMode === "hotel_to_airport" || criteria.routeMode === "point_to_point"
        ? context.dropoffLocation.airportCode
        : undefined,
    dropoffCityId: context.dropoffLocation.cityId,
    dropoffLocationLabel: context.dropoffLocation.defaultLabel,
    highlights: inventoryItem.highlights,
    id: supplierOfferId,
    imageUrl: inventoryItem.imageUrl,
    luggageCapacity: inventoryItem.luggageCapacity,
    luggageCount: criteria.luggageCount,
    meetAndGreetIncluded:
      criteria.meetAndGreet || inventoryItem.meetAndGreetIncluded,
    passengerCapacity: inventoryItem.passengerCapacity,
    passengerCount: criteria.passengerCount,
    pickupAirportCode:
      criteria.routeMode === "airport_to_hotel" || criteria.routeMode === "point_to_point"
        ? context.pickupLocation.airportCode ?? context.airportLocation?.airportCode
        : undefined,
    pickupAt: combineDateTime(criteria.pickupDate, criteria.pickupTime),
    pickupCityId: context.pickupLocation.cityId,
    pickupLocationLabel: context.pickupLocation.defaultLabel,
    routeMode: criteria.routeMode,
    searchHash: context.searchHash,
    serviceSummary: inventoryItem.serviceSummary,
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
    vehicleClass: inventoryItem.vehicleClass,
    vehicleName: inventoryItem.vehicleName,
    vendorName: inventoryItem.vendorName
  };
}
