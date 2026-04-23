import {type Money} from "@/lib/money";

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "refunded";

export type BookingSnapshot = {
  provider: string;
  offerId: string;
  capturedAt: string;
  price: Money;
  details: Record<string, unknown>;
};
