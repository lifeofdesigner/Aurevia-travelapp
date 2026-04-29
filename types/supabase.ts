import type {
  BookingStatus,
  BookingType,
  CabinClass,
  ConsentStatus,
  ConsentType,
  CurrencyCode,
  DataRequestStatus,
  DataRequestType,
  FlightTripType,
  HotelRateType,
  InvoiceStatus,
  LocaleCode,
  NotificationStatus,
  NotificationType,
  PaymentStatus,
  TransferType,
  UserRole,
  VisaApplicationStatus
} from "@/types/database-enums";

export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

type UntypedTableValue = Json | string | number | boolean | null;

type UntypedTable = {
  Row: Record<string, UntypedTableValue>;
  Insert: Record<string, UntypedTableValue | undefined>;
  Update: Record<string, UntypedTableValue | undefined>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, UntypedTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
      booking_type: BookingType;
      cabin_class: CabinClass;
      consent_status: ConsentStatus;
      consent_type: ConsentType;
      currency_code: CurrencyCode;
      data_request_status: DataRequestStatus;
      data_request_type: DataRequestType;
      flight_trip_type: FlightTripType;
      hotel_rate_type: HotelRateType;
      invoice_status: InvoiceStatus;
      locale_code: LocaleCode;
      notification_status: NotificationStatus;
      notification_type: NotificationType;
      payment_status: PaymentStatus;
      transfer_type: TransferType;
      user_role: UserRole;
      visa_application_status: VisaApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
