import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";
import {type HotelRateType} from "@/types/database-enums";

export const HOTEL_PROPERTY_TYPES = [
  "hotel",
  "resort",
  "boutique",
  "aparthotel",
  "villa"
] as const;
export type HotelPropertyType = (typeof HOTEL_PROPERTY_TYPES)[number];

export const HOTEL_AMENITIES = [
  "wifi",
  "spa",
  "pool",
  "gym",
  "breakfast",
  "parking",
  "concierge",
  "transfer"
] as const;
export type HotelAmenity = (typeof HOTEL_AMENITIES)[number];

export const HOTEL_SORT_OPTIONS = [
  "recommended",
  "price_asc",
  "rating_desc"
] as const;
export type HotelSortOption = (typeof HOTEL_SORT_OPTIONS)[number];

export const HOTEL_VIEW_OPTIONS = ["grid", "list"] as const;
export type HotelResultsView = (typeof HOTEL_VIEW_OPTIONS)[number];

export const HOTEL_GUEST_TYPES = ["adult", "child"] as const;
export type HotelGuestType = (typeof HOTEL_GUEST_TYPES)[number];

export type HotelSearchFormValues = {
  checkIn: string;
  checkOut: string;
  destination: string;
  guests: number;
  preferredStarRating?: number;
  propertyType?: HotelPropertyType;
  rooms: number;
};

export type HotelSearchCriteria = HotelSearchFormValues & {
  currency: SupportedCurrency;
  locale: Locale;
};

export type HotelPolicies = {
  cancellation: string;
  checkIn: string;
  checkOut: string;
  children: string;
  pets: string;
};

export type HotelRoomOption = {
  amenities: HotelAmenity[];
  bedsSummary: string;
  breakfastIncluded: boolean;
  cancellationSummary: string;
  description: string;
  guestCapacity: number;
  imageUrl: string;
  offerId: string;
  quantity: number;
  rateType: HotelRateType;
  refundable: boolean;
  roomCode: string;
  roomName: string;
  sizeSqm?: number;
  subtotalAmount: Money;
  supplierOfferId: string;
  taxAmount: Money;
  totalAmount: Money;
};

export type NormalizedHotelOffer = {
  addressLine: string;
  amenities: HotelAmenity[];
  breakfastIncluded: boolean;
  checkIn: string;
  checkOut: string;
  cheapestSubtotalAmount: Money;
  cheapestTaxAmount: Money;
  cheapestTotalAmount: Money;
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  description: string;
  featuredTags: string[];
  guestCount: number;
  guestRating: number;
  id: string;
  images: string[];
  latitude: number;
  longitude: number;
  neighborhood: string;
  nightCount: number;
  policies: HotelPolicies;
  propertyCode: string;
  propertyName: string;
  propertyType: HotelPropertyType;
  refundable: boolean;
  reviewCount: number;
  roomCount: number;
  roomOptions: HotelRoomOption[];
  searchHash: string;
  starRating: number;
  supplierCode: string;
};

export type HotelResultsFilters = {
  amenities: HotelAmenity[];
  breakfastIncluded: boolean;
  neighborhoods: string[];
  priceMax?: number;
  priceMin?: number;
  refundable: boolean;
  sort: HotelSortOption;
  stars: number[];
  view: HotelResultsView;
};

export type HotelResultsMetadata = {
  amenities: Array<{
    count: number;
    key: HotelAmenity;
  }>;
  maxPriceMinor: number;
  minPriceMinor: number;
  neighborhoods: Array<{
    count: number;
    name: string;
  }>;
  propertyTypes: HotelPropertyType[];
  starRatings: number[];
};

export type HotelSearchResponse = {
  criteria: HotelSearchCriteria;
  executedAt: string;
  metadata: HotelResultsMetadata;
  offers: NormalizedHotelOffer[];
  searchLogId: string;
};

export type HotelGuestFormValue = {
  firstName: string;
  guestType: HotelGuestType;
  lastName: string;
};

export type HotelBookingFormValues = {
  contactEmail: string;
  contactPhone?: string;
  guests: HotelGuestFormValue[];
  specialRequests?: string;
};

export type HotelBookingPayload = HotelBookingFormValues & {
  offerId: string;
  searchLogId?: string;
};

export type HotelBookingConfirmation = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  status: "pending_payment";
  totalAmountMinor: number;
};
