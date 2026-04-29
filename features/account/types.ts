import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";
import {
  type CookieConsentPreferences,
  type LegalDocumentSummaryRecord
} from "@/lib/privacy";
import type {
  BookingStatus,
  BookingType,
  DataRequestStatus,
  DataRequestType,
  InvoiceStatus,
  PaymentStatus,
  UserRole,
  VisaApplicationStatus
} from "@/types/database-enums";
import type {VisaProductType} from "@/features/visa/types";

export const TRAVELER_DOCUMENT_TYPES = [
  "passport",
  "national_id",
  "residence_permit",
  "visa",
  "driver_license",
  "other"
] as const;
export type TravelerDocumentType = (typeof TRAVELER_DOCUMENT_TYPES)[number];

export const TRAVELER_PROFILE_TYPES = ["adult", "child", "infant"] as const;
export type TravelerProfileType = (typeof TRAVELER_PROFILE_TYPES)[number];

export type CountryOption = {
  code: string;
  name: string;
};

export type DashboardIdentity = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  userId: string;
};

export type BillingAddressRecord = {
  cityName: string;
  companyName: string;
  countryCode: string;
  line1: string;
  line2: string;
  postalCode: string;
  recipientName: string;
  stateRegion: string;
  vatNumber: string;
};

export type ProfileSettingsRecord = {
  billingAddress: BillingAddressRecord | null;
  dateOfBirth: string;
  email: string;
  emailVerifiedAt: string | null;
  firstName: string;
  lastName: string;
  lastSignedInAt: string | null;
  marketingEmailOptIn: boolean;
  phone: string;
  preferredCurrency: SupportedCurrency;
  preferredLocale: Locale;
  role: UserRole;
  timeZone: string;
  userId: string;
};

export type ProfileSettingsFormValues = {
  billingAddressCityName: string;
  billingAddressCompanyName: string;
  billingAddressCountryCode: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingAddressPostalCode: string;
  billingAddressRecipientName: string;
  billingAddressStateRegion: string;
  billingAddressVatNumber: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  marketingEmailOptIn: boolean;
  phone: string;
  preferredCurrency: SupportedCurrency;
  preferredLocale: Locale;
};

export type TravelerDocumentRecord = {
  documentNumberLast4: string;
  documentType: TravelerDocumentType;
  expiresAt: string;
  id: string;
  issuedAt: string;
  issuingCountryCode: string;
  isPrimary: boolean;
};

export type TravelerProfileRecord = {
  dateOfBirth: string;
  email: string;
  firstName: string;
  gender: string;
  id: string;
  isPrimary: boolean;
  lastName: string;
  middleName: string;
  nationalityCountryCode: string;
  phone: string;
  primaryDocument: TravelerDocumentRecord | null;
  relationshipLabel: string;
  residenceCountryCode: string;
  specialAssistanceNotes: string;
  travelerType: TravelerProfileType;
};

export type TravelerProfileFormValues = {
  dateOfBirth: string;
  documentNumberLast4: string;
  documentType: TravelerDocumentType | "";
  email: string;
  expiresAt: string;
  firstName: string;
  gender: string;
  isPrimary: boolean;
  issuedAt: string;
  issuingCountryCode: string;
  lastName: string;
  middleName: string;
  nationalityCountryCode: string;
  phone: string;
  relationshipLabel: string;
  residenceCountryCode: string;
  specialAssistanceNotes: string;
  travelerType: TravelerProfileType;
};

export type BookingListItem = {
  bookingId: string;
  bookingReference: string;
  confirmedAt: string | null;
  createdAt: string;
  currency: SupportedCurrency;
  firstItemDescription: string | null;
  firstItemTitle: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  itemCount: number;
  paymentStatus: PaymentStatus;
  primaryBookingType: BookingType;
  refundAmountMinor: number;
  refundCount: number;
  status: BookingStatus;
  totalAmountMinor: number;
  travelerCount: number;
};

export type BookingTravelerRecord = {
  dateOfBirth: string | null;
  documentNumberLast4: string | null;
  firstName: string;
  id: string;
  lastName: string;
  nationalityCountryCode: string | null;
  travelerType: TravelerProfileType;
};

export type BookingDetailItem = {
  bookingItemId: string;
  bookingType: BookingType;
  currency: SupportedCurrency;
  description: string | null;
  quantity: number;
  serviceEndAt: string | null;
  serviceStartAt: string | null;
  snapshotPayload: Record<string, unknown>;
  status: BookingStatus;
  subtotalAmountMinor: number;
  supplierConfirmationReference: string | null;
  taxAmountMinor: number;
  title: string;
  totalAmountMinor: number;
};

export type BookingDetailRecord = {
  billingAddress: Record<string, unknown>;
  bookingId: string;
  bookingReference: string;
  confirmedAt: string | null;
  createdAt: string;
  currency: SupportedCurrency;
  customerEmail: string;
  customerPhone: string | null;
  discountAmountMinor: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  items: BookingDetailItem[];
  metadata: Record<string, unknown>;
  paymentAmountCapturedMinor: number;
  paymentAmountRefundedMinor: number;
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  primaryBookingType: BookingType;
  refunds: Array<{
    amountMinor: number;
    createdAt: string;
    currency: SupportedCurrency;
    id: string;
    reason: string | null;
    status: string;
  }>;
  status: BookingStatus;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  taxLines: Array<{
    amountMinor: number;
    bookingItemId: string | null;
    currency: SupportedCurrency;
    id: string;
    jurisdictionCountryCode: string | null;
    rate: number;
    taxableAmountMinor: number;
    taxName: string;
  }>;
  totalAmountMinor: number;
  travelers: BookingTravelerRecord[];
};

export type PaymentHistoryItem = {
  amountCapturedMinor: number;
  amountRefundedMinor: number;
  bookingId: string;
  bookingReference: string | null;
  createdAt: string;
  currency: SupportedCurrency;
  id: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  primaryBookingType: BookingType | null;
  providerPaymentReference: string | null;
  status: PaymentStatus;
};

export type InvoiceHistoryItem = {
  bookingId: string;
  bookingReference: string | null;
  createdAt: string;
  currency: SupportedCurrency;
  dueAt: string | null;
  id: string;
  invoiceNumber: string;
  paidAt: string | null;
  status: InvoiceStatus;
  subtotalAmountMinor: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
};

export type VisaApplicationListItem = {
  applicationReference: string | null;
  countryCode: string;
  createdAt: string;
  id: string;
  status: VisaApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  uploadCount: number;
  visaType: VisaProductType;
};

export type VisaApplicationDetail = VisaApplicationListItem & {
  formData: Record<string, unknown>;
  reviewedAt: string | null;
  uploads: Array<{
    accessPath: string;
    byteSize: number;
    createdAt: string;
    documentCategory: string;
    documentType: string;
    fileName: string;
    id: string;
    mimeType: string;
  }>;
};

export type DashboardOverviewRecord = {
  activeVisaApplicationsCount: number;
  pendingPaymentBookingsCount: number;
  recentBookings: BookingListItem[];
  recentInvoices: InvoiceHistoryItem[];
  recentVisaApplications: VisaApplicationListItem[];
  savedTravelersCount: number;
  totalBookingsCount: number;
};

export type PrivacyDataRequestRecord = {
  completedAt: string | null;
  createdAt: string;
  id: string;
  rejectedReason: string | null;
  requestDetails: Record<string, unknown>;
  requestType: DataRequestType;
  responseSummary: string | null;
  status: DataRequestStatus;
};

export type PrivacyCenterRecord = {
  cookiePreferences: CookieConsentPreferences;
  dataRequests: PrivacyDataRequestRecord[];
  legalDocuments: LegalDocumentSummaryRecord[];
  marketingEmailOptIn: boolean;
  profilingOptIn: boolean;
};

export type PrivacyPreferencesFormValues = {
  analyticsCookies: boolean;
  marketingCookies: boolean;
  marketingEmailOptIn: boolean;
  profilingOptIn: boolean;
};

export type PrivacyDataRequestFormValues = {
  details: string;
  requestType: Extract<DataRequestType, "erasure" | "portability">;
};
