import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";
import {type TransferType} from "@/types/database-enums";

export const TRANSFER_ROUTE_MODES = [
  "airport_to_hotel",
  "hotel_to_airport",
  "point_to_point"
] as const;
export type TransferRouteMode = (typeof TRANSFER_ROUTE_MODES)[number];

export const TRANSFER_VEHICLE_CLASSES = [
  "private",
  "shared",
  "luxury",
  "chauffeur",
  "shuttle"
] as const;
export type TransferVehicleClass = (typeof TRANSFER_VEHICLE_CLASSES)[number];

export const TRANSFER_SORT_OPTIONS = [
  "recommended",
  "price_asc",
  "capacity_desc"
] as const;
export type TransferSortOption = (typeof TRANSFER_SORT_OPTIONS)[number];

export type TransferSearchFormValues = {
  airportCode?: string;
  dropoffLocation: string;
  flightNumber?: string;
  luggageCount: number;
  meetAndGreet: boolean;
  passengerCount: number;
  pickupDate: string;
  pickupLocation: string;
  pickupTime: string;
  routeMode: TransferRouteMode;
  vehicleClass?: TransferVehicleClass;
};

export type TransferSearchCriteria = TransferSearchFormValues & {
  currency: SupportedCurrency;
  locale: Locale;
};

export type NormalizedTransferOffer = {
  airportCode?: string;
  dropoffAirportCode?: string;
  dropoffCityId: string;
  dropoffLocationLabel: string;
  highlights: string[];
  id: string;
  imageUrl: string;
  luggageCapacity: number;
  luggageCount: number;
  meetAndGreetIncluded: boolean;
  passengerCapacity: number;
  passengerCount: number;
  pickupAirportCode?: string;
  pickupAt: string;
  pickupCityId: string;
  pickupLocationLabel: string;
  routeMode: TransferRouteMode;
  searchHash: string;
  serviceSummary: string;
  subtotalAmount: Money;
  supplierCode: string;
  supplierOfferId: string;
  taxAmount: Money;
  totalAmount: Money;
  vehicleClass: TransferType;
  vehicleName: string;
  vendorName: string;
};

export type TransferResultsFilters = {
  meetAndGreetOnly: boolean;
  priceMax?: number;
  priceMin?: number;
  sort: TransferSortOption;
  vehicleClasses: TransferVehicleClass[];
};

export type TransferResultsMetadata = {
  maxPriceMinor: number;
  minPriceMinor: number;
  vehicleClasses: Array<{
    count: number;
    key: TransferVehicleClass;
  }>;
};

export type TransferSearchResponse = {
  criteria: TransferSearchCriteria;
  executedAt: string;
  metadata: TransferResultsMetadata;
  offers: NormalizedTransferOffer[];
  searchLogId: string;
};

export type TransferBookingFormValues = {
  contactEmail: string;
  contactPhone?: string;
  flightNumber?: string;
  leadPassengerFirstName: string;
  leadPassengerLastName: string;
  specialRequests?: string;
};

export type TransferBookingPayload = TransferBookingFormValues & {
  flightNumber?: string;
  offerId: string;
  searchLogId?: string;
};

export type TransferBookingConfirmation = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  status: "pending_payment";
  totalAmountMinor: number;
};
