export const USER_ROLES = ["customer", "support", "admin", "owner"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BOOKING_TYPES = [
  "flight",
  "hotel",
  "car_rental",
  "airport_transfer",
  "tour",
  "visa"
] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_STATUSES = [
  "draft",
  "pending",
  "pending_payment",
  "confirmed",
  "partially_confirmed",
  "cancelled",
  "refunded",
  "expired"
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "requires_action",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
  "expired"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "paid",
  "void",
  "refunded",
  "overdue"
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CURRENCY_CODES = ["EUR", "USD", "GBP", "AED", "NGN"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const LOCALE_CODES = ["en", "de"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const FLIGHT_TRIP_TYPES = [
  "one_way",
  "round_trip",
  "multi_city"
] as const;
export type FlightTripType = (typeof FLIGHT_TRIP_TYPES)[number];

export const CABIN_CLASSES = [
  "economy",
  "premium_economy",
  "business",
  "first"
] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const HOTEL_RATE_TYPES = [
  "room_only",
  "bed_and_breakfast",
  "half_board",
  "full_board",
  "all_inclusive"
] as const;
export type HotelRateType = (typeof HOTEL_RATE_TYPES)[number];

export const TRANSFER_TYPES = [
  "private",
  "shared",
  "luxury",
  "chauffeur",
  "shuttle"
] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

export const VISA_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "needs_changes",
  "action_required",
  "approved",
  "rejected",
  "cancelled",
  "withdrawn"
] as const;
export type VisaApplicationStatus = (typeof VISA_APPLICATION_STATUSES)[number];

export const CONSENT_TYPES = [
  "necessary_cookies",
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "refund_policy",
  "analytics_cookies",
  "marketing_cookies",
  "marketing_email",
  "profiling",
  "visa_document_processing"
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_STATUSES = [
  "granted",
  "denied",
  "withdrawn",
  "pending"
] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const DATA_REQUEST_TYPES = [
  "access",
  "erasure",
  "rectification",
  "portability",
  "restriction",
  "objection"
] as const;
export type DataRequestType = (typeof DATA_REQUEST_TYPES)[number];

export const DATA_REQUEST_STATUSES = [
  "submitted",
  "verifying_identity",
  "in_progress",
  "fulfilled",
  "rejected",
  "cancelled"
] as const;
export type DataRequestStatus = (typeof DATA_REQUEST_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "booking_update",
  "payment_update",
  "refund_update",
  "visa_update",
  "support_update",
  "system_announcement",
  "legal_update",
  "marketing"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "archived"
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
