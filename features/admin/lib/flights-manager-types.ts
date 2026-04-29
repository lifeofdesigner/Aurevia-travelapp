import type {BookingStatus, PaymentStatus} from "@/types/database-enums";

export type AdminFlightSearchRecord = {
  createdAt: string;
  departureDate: string | null;
  destinationQuery: string | null;
  id: string;
  originQuery: string | null;
  resultCount: number;
  returnDate: string | null;
};

export type AdminFlightBookingRecord = {
  bookingId: string;
  bookingReference: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  departureDate: string;
  destinationCode: string;
  originCode: string;
  paymentStatus: PaymentStatus;
  returnDate: string | null;
  status: BookingStatus;
};

export type AdminFeaturedFlightRoute = {
  destinationCode: string;
  id: string;
  isActive: boolean;
  label: string;
  originCode: string;
};

export type AdminFlightMarkupRule = {
  airlineCode: string | null;
  airlineName: string | null;
  destinationCode: string | null;
  id: string;
  isActive: boolean;
  markupPercent: number;
  originCode: string | null;
  scope: "airline" | "route";
};

export type AdminFlightAirlineVisibility = {
  airlineCode: string;
  airlineName: string;
  id: string;
  isHidden: boolean;
};

export type AdminFlightBaggageOverride = {
  airlineCode: string | null;
  airlineName: string | null;
  destinationCode: string | null;
  id: string;
  isActive: boolean;
  message: string;
  originCode: string | null;
  scope: "airline" | "route";
};

export type AdminFlightsManagerData = {
  airlineVisibility: AdminFlightAirlineVisibility[];
  baggageOverrides: AdminFlightBaggageOverride[];
  bookings: AdminFlightBookingRecord[];
  featuredRoutes: AdminFeaturedFlightRoute[];
  markupRules: AdminFlightMarkupRule[];
  searches: AdminFlightSearchRecord[];
};
