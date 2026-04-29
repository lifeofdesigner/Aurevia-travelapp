import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";

export const TOUR_CATEGORIES = [
  "culture",
  "culinary",
  "adventure",
  "water",
  "wellness",
  "sightseeing"
] as const;
export type TourCategory = (typeof TOUR_CATEGORIES)[number];

export const TOUR_DURATION_OPTIONS = [
  "short",
  "half_day",
  "full_day",
  "evening"
] as const;
export type TourDurationOption = (typeof TOUR_DURATION_OPTIONS)[number];

export const TOUR_SORT_OPTIONS = [
  "recommended",
  "price_asc",
  "rating_desc",
  "duration_asc"
] as const;
export type TourSortOption = (typeof TOUR_SORT_OPTIONS)[number];

export type TourSearchFormValues = {
  category?: TourCategory;
  destination: string;
  duration?: TourDurationOption;
  serviceDate: string;
};

export type TourSearchCriteria = TourSearchFormValues & {
  currency: SupportedCurrency;
  locale: Locale;
};

export type TourPriceBreakdown = {
  subtotalAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
};

export type TourAvailabilitySlot = {
  endsAt: string;
  label: string;
  remainingCapacity: number;
  slotId: string;
  soldOut: boolean;
  startsAt: string;
};

export type TourAddOn = {
  code: string;
  description: string;
  subtotalAmount: Money;
  taxAmount: Money;
  title: string;
  totalAmount: Money;
};

export type TourFaqItem = {
  answer: string;
  question: string;
};

export type NormalizedTourOffer = {
  addOns: TourAddOn[];
  adultPrice: TourPriceBreakdown;
  availabilitySlots: TourAvailabilitySlot[];
  cancellationPolicy: string;
  category: TourCategory;
  childPrice: TourPriceBreakdown;
  cityName: string;
  countryCode: string;
  countryName: string;
  description: string;
  destinationId: string;
  durationBucket: TourDurationOption;
  durationMinutes: number;
  exclusions: string[];
  familyFriendly: boolean;
  faqs: TourFaqItem[];
  groupFriendly: boolean;
  highlights: string[];
  id: string;
  images: string[];
  inclusions: string[];
  meetingInstructions: string;
  meetingPoint: string;
  overview: string;
  priceFromTotalAmount: Money;
  privateAvailable: boolean;
  reviewCount: number;
  reviewRating: number;
  searchHash: string;
  serviceDate: string;
  supplierCode: string;
  supplierOfferId: string;
  ticketDeliveryMethod: string;
  title: string;
};

export type TourResultsFilters = {
  categories: TourCategory[];
  durationOptions: TourDurationOption[];
  familyFriendly: boolean;
  groupFriendly: boolean;
  priceMax?: number;
  priceMin?: number;
  privateAvailable: boolean;
  sort: TourSortOption;
};

export type TourResultsMetadata = {
  categories: Array<{
    count: number;
    key: TourCategory;
  }>;
  durationOptions: Array<{
    count: number;
    key: TourDurationOption;
  }>;
  maxPriceMinor: number;
  minPriceMinor: number;
};

export type TourSearchResponse = {
  criteria: TourSearchCriteria;
  executedAt: string;
  metadata: TourResultsMetadata;
  offers: NormalizedTourOffer[];
  searchLogId: string;
};

export type TourBookingFormValues = {
  adults: number;
  children: number;
  contactEmail: string;
  contactPhone?: string;
  leadTravelerFirstName: string;
  leadTravelerLastName: string;
  selectedAddOnCodes?: string[];
  slotId: string;
  specialRequests?: string;
};

export type TourBookingPayload = TourBookingFormValues & {
  offerId: string;
  searchLogId?: string;
};

export type TourBookingConfirmation = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  status: "pending_payment";
  totalAmountMinor: number;
};
