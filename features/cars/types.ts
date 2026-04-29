import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";

export const CAR_CATEGORIES = [
  "compact",
  "sedan",
  "suv",
  "luxury",
  "van"
] as const;
export type CarCategory = (typeof CAR_CATEGORIES)[number];

export const CAR_TRANSMISSIONS = ["automatic", "manual"] as const;
export type CarTransmission = (typeof CAR_TRANSMISSIONS)[number];

export const CAR_FUEL_TYPES = [
  "petrol",
  "diesel",
  "hybrid",
  "electric"
] as const;
export type CarFuelType = (typeof CAR_FUEL_TYPES)[number];

export const CAR_SORT_OPTIONS = [
  "recommended",
  "price_asc",
  "seats_desc"
] as const;
export type CarSortOption = (typeof CAR_SORT_OPTIONS)[number];

export type CarSearchFormValues = {
  driverAge: number;
  dropoffDate: string;
  dropoffLocation: string;
  dropoffTime: string;
  pickupDate: string;
  pickupLocation: string;
  pickupTime: string;
  preferredCategory?: CarCategory;
};

export type CarSearchCriteria = CarSearchFormValues & {
  currency: SupportedCurrency;
  locale: Locale;
};

export type NormalizedCarOffer = {
  bagCount: number;
  currency: SupportedCurrency;
  doorCount: number;
  driverAgeMin: number;
  dropoffAirportCode?: string;
  dropoffAt: string;
  dropoffCityId: string;
  dropoffLocationLabel: string;
  fuelPolicy: string;
  fuelType: CarFuelType;
  highlights: string[];
  id: string;
  imageUrl: string;
  insuranceSummary: string;
  mileagePolicy: string;
  pickupAirportCode?: string;
  pickupAt: string;
  pickupCityId: string;
  pickupLocationLabel: string;
  rentalTermsSummary: string;
  searchHash: string;
  seatCount: number;
  subtotalAmount: Money;
  supplierCode: string;
  supplierOfferId: string;
  taxAmount: Money;
  totalAmount: Money;
  transmissionType: CarTransmission;
  vehicleCategory: CarCategory;
  vehicleName: string;
  vendorCode: string;
  vendorName: string;
};

export type CarResultsFilters = {
  categories: CarCategory[];
  fuelTypes: CarFuelType[];
  priceMax?: number;
  priceMin?: number;
  seatsMin?: number;
  sort: CarSortOption;
  transmissions: CarTransmission[];
};

export type CarResultsMetadata = {
  categories: Array<{
    count: number;
    key: CarCategory;
  }>;
  fuelTypes: Array<{
    count: number;
    key: CarFuelType;
  }>;
  maxPriceMinor: number;
  minPriceMinor: number;
  seatCounts: number[];
  transmissions: Array<{
    count: number;
    key: CarTransmission;
  }>;
};

export type CarSearchResponse = {
  criteria: CarSearchCriteria;
  executedAt: string;
  metadata: CarResultsMetadata;
  offers: NormalizedCarOffer[];
  searchLogId: string;
};

export type CarBookingFormValues = {
  contactEmail: string;
  contactPhone?: string;
  driverFirstName: string;
  driverLastName: string;
  specialRequests?: string;
};

export type CarBookingPayload = CarBookingFormValues & {
  offerId: string;
  searchLogId?: string;
};

export type CarBookingConfirmation = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  status: "pending_payment";
  totalAmountMinor: number;
};
