import {type Money} from "@/lib/money";
import type {
  BookingStatus,
  BookingType,
  CabinClass,
  FlightTripType,
  PaymentStatus
} from "@/types/database-enums";

export type {BookingStatus} from "@/types/database-enums";

export type BookingSnapshot = {
  provider: string;
  offerId: string;
  capturedAt: string;
  bookingType?: BookingType;
  tripType?: FlightTripType;
  cabinClass?: CabinClass;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  price: Money;
  details: Record<string, unknown>;
};
