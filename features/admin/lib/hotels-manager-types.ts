import type {BookingStatus, PaymentStatus} from "@/types/database-enums";

export type AdminHotelSearchRecord = {
  checkInDate: string | null;
  checkOutDate: string | null;
  createdAt: string;
  destinationQuery: string | null;
  id: string;
  resultCount: number;
};

export type AdminHotelBookingRecord = {
  bookingId: string;
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  paymentStatus: PaymentStatus;
  propertyName: string;
  status: BookingStatus;
};

export type AdminFeaturedHotelProperty = {
  cityName: string | null;
  id: string;
  isActive: boolean;
  label: string;
  propertyName: string;
};

export type AdminHotelMarkupRule = {
  cityName: string | null;
  id: string;
  isActive: boolean;
  markupPercent: number;
  propertyName: string | null;
  scope: "city" | "property";
};

export type AdminHiddenHotelProperty = {
  cityName: string | null;
  id: string;
  isHidden: boolean;
  propertyName: string;
};

export type AdminHotelsManagerData = {
  bookings: AdminHotelBookingRecord[];
  featuredProperties: AdminFeaturedHotelProperty[];
  hiddenProperties: AdminHiddenHotelProperty[];
  markupRules: AdminHotelMarkupRule[];
  searches: AdminHotelSearchRecord[];
};
