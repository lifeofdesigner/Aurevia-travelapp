import {type Locale} from "@/lib/i18n/routing";
import {type Money, type SupportedCurrency} from "@/lib/money";
import {type CabinClass} from "@/types/database-enums";

export const SUPPORTED_FLIGHT_TRIP_TYPES = ["one_way", "round_trip", "multi_city"] as const;
export type SupportedFlightTripType =
  (typeof SUPPORTED_FLIGHT_TRIP_TYPES)[number];

export const FLIGHT_SORT_OPTIONS = [
  "best",
  "price_asc",
  "duration_asc",
  "departure_asc",
  "arrival_asc"
] as const;
export type FlightSortOption = (typeof FLIGHT_SORT_OPTIONS)[number];

export const FLIGHT_TIME_WINDOWS = [
  "overnight",
  "morning",
  "afternoon",
  "evening"
] as const;
export type FlightTimeWindow = (typeof FLIGHT_TIME_WINDOWS)[number];

export const FLIGHT_TRAVELER_TYPES = ["adult", "child", "infant"] as const;
export type FlightTravelerType = (typeof FLIGHT_TRAVELER_TYPES)[number];

export type FlightPassengerCounts = {
  adults: number;
  children: number;
  infants: number;
};

export type FlightSearchSegment = {
  departureDate: string;
  destination: string;
  origin: string;
};

export type FlightSearchCriteria = {
  adults: number;
  cabinClass: CabinClass;
  children: number;
  currency: SupportedCurrency;
  departureDate: string;
  destination: string;
  infants: number;
  locale: Locale;
  multiCitySegments?: FlightSearchSegment[];
  origin: string;
  returnDate?: string;
  tripType: SupportedFlightTripType;
};

export type FlightSearchFormValues = Omit<
  FlightSearchCriteria,
  "adults" | "children" | "infants"
> & {
  adults: number | string;
  children: number | string;
  infants: number | string;
};

export type FlightSegment = {
  aircraftCode?: string;
  arrivalAt: string;
  cabinClass: CabinClass;
  departureAt: string;
  destinationAirportCode: string;
  destinationAirportName: string;
  destinationCityName: string;
  destinationTimeZone: string;
  durationMinutes: number;
  fareClassCode?: string;
  flightNumber: string;
  marketingAirlineCode: string;
  marketingAirlineName: string;
  operatingAirlineCode?: string;
  operatingAirlineName?: string;
  originAirportCode: string;
  originAirportName: string;
  originCityName: string;
  originTimeZone: string;
  segmentId: string;
  baggageAllowance?: {
    cabin?: string;
    checked?: string;
  };
};

export type FlightLeg = {
  arrivalAt: string;
  departureAt: string;
  destinationAirportCode: string;
  durationMinutes: number;
  legIndex: number;
  originAirportCode: string;
  segments: FlightSegment[];
  stopCount: number;
};

export type FlightFareConditions = {
  cancellationSummary: string;
  changeSummary: string;
  changeable: boolean;
  refundable: boolean;
  ticketingDeadlineAt?: string;
};

export type FlightBaggageSummary = {
  cabin: string;
  checked: string;
  notes?: string;
};

export type NormalizedFlightOffer = {
  airlineCodes: string[];
  airlineNames: string[];
  baggageIncluded: boolean;
  baggageSummary: FlightBaggageSummary;
  baseAmount: Money;
  cabinClass: CabinClass;
  departureDate: string;
  destinationAirportCode: string;
  destinationAirportName: string;
  destinationCityName: string;
  expiresAt: string;
  fareConditions: FlightFareConditions;
  id: string;
  legs: FlightLeg[];
  metadata: Record<string, unknown>;
  originAirportCode: string;
  originAirportName: string;
  originCityName: string;
  passengerCounts: FlightPassengerCounts;
  refundable: boolean;
  returnDate?: string;
  searchHash: string;
  stopCount: number;
  supplierCode: string;
  supplierOfferId: string;
  taxAmount: Money;
  totalAmount: Money;
  totalDurationMinutes: number;
  tripType: SupportedFlightTripType;
};

export type FlightResultsFilters = {
  airlines: string[];
  arrivalWindows: FlightTimeWindow[];
  baggageIncluded: boolean;
  cabins: CabinClass[];
  departureWindows: FlightTimeWindow[];
  priceMax?: number;
  priceMin?: number;
  refundable: boolean;
  sort: FlightSortOption;
  stops: number[];
};

export type FlightResultsMetadata = {
  airlines: Array<{
    code: string;
    count: number;
    name: string;
  }>;
  cabins: CabinClass[];
  maxPriceMinor: number;
  minPriceMinor: number;
};

export type FlightSearchResponse = {
  criteria: FlightSearchCriteria;
  executedAt: string;
  metadata: FlightResultsMetadata;
  offers: NormalizedFlightOffer[];
  searchLogId: string;
};

export type FlightTravelerFormValue = {
  dateOfBirth?: string;
  firstName: string;
  lastName: string;
  travelerType: FlightTravelerType;
};

export type FlightBookingPayload = {
  contactEmail: string;
  contactPhone?: string;
  offerId: string;
  saveTravelerProfiles: boolean;
  searchLogId?: string;
  specialRequests?: string;
  travelers: FlightTravelerFormValue[];
};

export type FlightBookingConfirmation = {
  bookingId: string;
  bookingReference: string;
  currency: SupportedCurrency;
  status: "pending_payment";
  totalAmountMinor: number;
};
