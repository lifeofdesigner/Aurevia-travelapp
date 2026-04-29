import {type SupportedCurrency} from "@/lib/money";
import type {
  BookingStatus,
  BookingType,
  DataRequestStatus,
  DataRequestType,
  InvoiceStatus,
  LocaleCode,
  PaymentStatus,
  UserRole,
  VisaApplicationStatus
} from "@/types/database-enums";

export const ADMIN_RESOURCE_KEYS = [
  "customers",
  "destinations",
  "airports",
  "airlines",
  "featured-content",
  "legal",
  "visa-products",
  "suppliers",
  "coupons",
  "settings"
] as const;

export type AdminResourceKey = (typeof ADMIN_RESOURCE_KEYS)[number];

export type AdminStaffIdentity = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  userId: string;
};

export type AdminDashboardMetric = {
  description: string;
  label: string;
  value: string;
};

export type AdminAnalyticsChartPoint = {
  label: string;
  value: number;
};

export type AdminActivityItem = {
  createdAt: string;
  description: string;
  href: string | null;
  id: string;
  title: string;
  type: "audit" | "booking" | "payment" | "visa";
};

export type AdminDashboardRecentBooking = {
  bookingId: string;
  bookingReference: string;
  createdAt: string;
  currency: SupportedCurrency;
  customerEmail: string;
  customerName: string;
  paymentStatus: PaymentStatus;
  primaryBookingType: BookingType;
  status: BookingStatus;
  totalAmountMinor: number;
};

export type AdminDashboardAnalytics = {
  bookingVolumeByType: AdminAnalyticsChartPoint[];
  metrics: {
    activeUsersNow: number;
    bookingsThisMonth: number;
    bookingsThisWeek: number;
    bookingsToday: number;
    pendingSupportTickets: number;
    pendingVisaApplications: number;
    revenueThisMonthMinor: number;
    revenueThisWeekMinor: number;
    revenueTodayMinor: number;
  };
  recentBookings: AdminDashboardRecentBooking[];
  revenueByDay: AdminAnalyticsChartPoint[];
  topRoutes: AdminAnalyticsChartPoint[];
};

export type AdminPagination = {
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
};

export type AdminBookingListItem = {
  bookingId: string;
  bookingReference: string;
  createdAt: string;
  currency: SupportedCurrency;
  customerEmail: string;
  customerName: string;
  customerUserId: string;
  paymentStatus: PaymentStatus;
  primaryBookingType: BookingType;
  status: BookingStatus;
  totalAmountMinor: number;
};

export type AdminBookingDetailItem = {
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

export type AdminNoteRecord = {
  authorLabel: string;
  createdAt: string;
  id: string;
  isVisibleToCustomer: boolean;
  noteBody: string;
  title: string | null;
};

export type AdminAuditRecord = {
  action: string;
  actorLabel: string;
  createdAt: string;
  entityType: string;
  id: string;
};

export type AdminBookingDetail = {
  billingAddress: Record<string, unknown>;
  bookingId: string;
  bookingReference: string;
  confirmedAt: string | null;
  createdAt: string;
  createdByUserId: string | null;
  currency: SupportedCurrency;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  customerUserId: string;
  discountAmountMinor: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  items: AdminBookingDetailItem[];
  metadata: Record<string, unknown>;
  notes: AdminNoteRecord[];
  paymentAmountCapturedMinor: number;
  paymentAmountRefundedMinor: number;
  paymentId: string | null;
  paymentProviderReference: string | null;
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
  supportTickets: Array<{
    id: string;
    priority: string;
    status: string;
    subject: string;
    ticketNumber: string;
  }>;
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
  travelers: Array<{
    dateOfBirth: string | null;
    documentNumberLast4: string | null;
    firstName: string;
    id: string;
    lastName: string;
    nationalityCountryCode: string | null;
    travelerType: "adult" | "child" | "infant";
  }>;
  auditTrail: AdminAuditRecord[];
};

export type AdminBookingFilters = {
  currency?: SupportedCurrency;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  maxTotalAmountMinor?: number;
  page: number;
  paymentStatus?: PaymentStatus;
  query?: string;
  status?: BookingStatus;
  type?: BookingType;
  minTotalAmountMinor?: number;
};

export type AdminCustomerListItem = {
  bookingCount: number;
  createdAt: string;
  email: string;
  firstName: string | null;
  isSuspended: boolean;
  lastName: string | null;
  lastSignedInAt: string | null;
  phone: string | null;
  role: UserRole;
  spendSummary: Array<{
    amountMinor: number;
    currency: SupportedCurrency;
  }>;
  updatedAt: string;
  userId: string;
  visaApplicationCount: number;
};

export type AdminCustomerFilters = {
  page: number;
  query?: string;
  role?: UserRole;
};

export type AdminCustomerDetail = {
  bookingCount: number;
  bookings: Array<{
    bookingId: string;
    bookingReference: string;
    createdAt: string;
    currency: SupportedCurrency;
    paymentStatus: PaymentStatus;
    primaryBookingType: BookingType;
    status: BookingStatus;
    totalAmountMinor: number;
  }>;
  createdAt: string;
  email: string;
  firstName: string | null;
  isSuspended: boolean;
  lastLoginAt: string | null;
  lastName: string | null;
  notes: AdminNoteRecord[];
  phone: string | null;
  role: UserRole;
  spendSummary: Array<{
    amountMinor: number;
    currency: SupportedCurrency;
  }>;
  userId: string;
  visaApplicationCount: number;
};

export type AdminVisaQueueItem = {
  applicationId: string;
  applicationReference: string | null;
  countryCode: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  reviewedAt: string | null;
  status: VisaApplicationStatus;
  submittedAt: string | null;
  uploadCount: number;
};

export type AdminVisaQueueFilters = {
  countryCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  query?: string;
  status?: VisaApplicationStatus;
};

export type AdminVisaApplicationDetail = {
  applicationId: string;
  applicationReference: string | null;
  countryCode: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  formData: Record<string, unknown>;
  notes: AdminNoteRecord[];
  reviewedAt: string | null;
  status: VisaApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  uploads: Array<{
    accessPath: string;
    byteSize: number;
    createdAt: string;
    documentType: string;
    fileName: string;
    id: string;
    mimeType: string;
  }>;
};

export type AdminSupportTicketItem = {
  assignedAdminLabel: string | null;
  assignedAdminUserId: string | null;
  bookingReference: string | null;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  description: string;
  id: string;
  priority: string;
  status: string;
  subject: string;
  ticketNumber: string;
};

export type AdminSupportFilters = {
  assignedAdminUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  priority?: string;
  query?: string;
  status?: string;
};

export type AdminSupportMessageRecord = {
  authorLabel: string;
  createdAt: string;
  deliveryChannel: string;
  id: string;
  messageBody: string;
  visibility: "customer" | "internal";
};

export type AdminSupportTicketDetail = {
  assignedAdminLabel: string | null;
  assignedAdminUserId: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  description: string;
  id: string;
  messages: AdminSupportMessageRecord[];
  notes: AdminNoteRecord[];
  ownerUserId: string;
  priority: string;
  status: string;
  subject: string;
  ticketNumber: string;
};

export type AdminPrivacyOperationalSummary = {
  bookingsCount: number;
  financeRecordsCount: number;
  retentionFlags: string[];
  travelerProfilesCount: number;
  uploadsCount: number;
  visaApplicationsCount: number;
};

export type AdminDataRequestItem = {
  assignedAdminLabel: string | null;
  assignedAdminUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  id: string;
  rejectedReason: string | null;
  requestDetails: Record<string, unknown>;
  requestType: DataRequestType;
  responseSummary: string | null;
  status: DataRequestStatus;
  summary: AdminPrivacyOperationalSummary | null;
  userId: string | null;
};

export type AdminDataRequestFilters = {
  page: number;
  query?: string;
  status?: DataRequestStatus;
  type?: DataRequestType;
};

export type AdminSelectOption = {
  label: string;
  value: string;
};

export type AdminReferenceData = {
  adminUsers: AdminSelectOption[];
  airports: AdminSelectOption[];
  cities: AdminSelectOption[];
  countries: AdminSelectOption[];
  destinations: AdminSelectOption[];
};

export type AdminResourceField =
  | {
      description?: string;
      label: string;
      name: string;
      placeholder?: string;
      required?: boolean;
      type: "date" | "datetime-local" | "email" | "number" | "text" | "textarea";
    }
  | {
      description?: string;
      label: string;
      name: string;
      required?: boolean;
      type: "checkbox";
    }
  | {
      description?: string;
      label: string;
      name: string;
      options: AdminSelectOption[];
      placeholder?: string;
      required?: boolean;
      type: "select";
    }
  | {
      description?: string;
      label: string;
      name: string;
      options: AdminSelectOption[];
      required?: boolean;
      type: "checkbox-group";
    }
  | {
      description?: string;
      label: string;
      name: string;
      placeholder?: string;
      required?: boolean;
      type: "json" | "tags";
    };

export type AdminResourceColumn = {
  key: string;
  label: string;
};

export type AdminResourceRow = {
  cells: Record<string, string>;
  id: string;
  updatedAt?: string | null;
  values: Record<string, boolean | number | string | string[] | null>;
};

export type AdminResourcePageData = {
  allowCreate: boolean;
  allowDelete: boolean;
  allowEdit: boolean;
  columns: AdminResourceColumn[];
  fields: AdminResourceField[];
  resource: AdminResourceKey;
  rows: AdminResourceRow[];
};

export type AdminManagedMutationPayload = {
  id?: string;
  values: Record<string, unknown>;
};

export type AdminResourceListFilters = {
  locale?: LocaleCode;
};
