import {type AdminRole} from "@/lib/auth/admin-auth-config";
import {type SiteThemeKey} from "@/lib/theme/site-themes";

export const ADMIN_INTEGRATION_KEYS = [
  "duffel",
  "paystack",
  "stripe",
  "flutterwave",
  "korapay",
  "email_delivery",
  "google_maps",
  "exchange_rates"
] as const;

export type AdminIntegrationKey = (typeof ADMIN_INTEGRATION_KEYS)[number];

export type AdminIntegrationEnvironment = "live" | "test";
export type AdminEmailProvider = "resend" | "sendgrid";
export type AdminIntegrationStatus = "connected" | "failed" | "not_tested";

export type AdminIntegrationFieldView = {
  label: string;
  maskedValue: string | null;
  name: string;
  placeholder: string;
};

export type AdminIntegrationView = {
  description: string;
  environment: AdminIntegrationEnvironment;
  fields: AdminIntegrationFieldView[];
  key: AdminIntegrationKey;
  lastTestMessage: string | null;
  lastTestedAt: string | null;
  provider: AdminEmailProvider | null;
  status: AdminIntegrationStatus;
  title: string;
};

export type AdminIntegrationsManagerData = {
  items: AdminIntegrationView[];
};

export const ADMIN_PAYMENT_METHOD_KEYS = [
  "stripe",
  "paystack",
  "bank_transfer",
  "flutterwave",
  "korapay"
] as const;

export type AdminPaymentMethodKey = (typeof ADMIN_PAYMENT_METHOD_KEYS)[number];

export type AdminPaymentProviderCredentialView = Pick<
  AdminIntegrationView,
  | "description"
  | "environment"
  | "fields"
  | "key"
  | "lastTestMessage"
  | "lastTestedAt"
  | "status"
  | "title"
>;

export const ADMIN_SITE_SETTINGS_SECTIONS = [
  "general",
  "booking",
  "access",
  "email",
  "payment",
  "maintenance"
] as const;

export type AdminSiteSettingsSection = (typeof ADMIN_SITE_SETTINGS_SECTIONS)[number];

export type AdminGeneralSettings = {
  businessAddress: string;
  businessCity: string;
  businessCountry: string;
  businessLocation: string;
  contactEmail: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  siteName: string;
  supportPhone: string;
  tagline: string;
  whatsappNumber: string;
  websiteTheme: SiteThemeKey;
};

export type AdminBookingSettings = {
  cancellationPolicyText: string;
  defaultCurrency: string;
  serviceFeePercentage: number;
  supportedCurrencies: string[];
  termsAndConditionsUrl: string;
};

export type AdminAccessSettings = {
  customerLoginRequiresEmailConfirmation: boolean;
  customerLoginRequiresSmsConfirmation: boolean;
  guestCheckoutEnabled: boolean;
};

export type AdminEmailSettings = {
  automations: {
    bookingCancellation: boolean;
    bookingConfirmation: boolean;
    bookingReminder: boolean;
    paymentReceipt: boolean;
    visaStatusUpdate: boolean;
    welcome: boolean;
  };
  footerText: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
};

export type AdminEmailTemplatePreview = {
  html: string;
  key: "booking_cancellation" | "booking_confirmation" | "payment_receipt" | "visa_status_update" | "welcome";
  subject: string;
  title: string;
};

export type AdminPaymentSettings = {
  bankTransferDetails: string;
  paymentMethods: AdminPaymentMethodKey[];
  providerCredentials?: AdminPaymentProviderCredentialView[];
  refundProcessingDays: number;
};

export type AdminMaintenanceSettings = {
  allowedIps: string[];
  enabled: boolean;
  message: string;
};

export type AdminSiteSettingsData = {
  access: AdminAccessSettings;
  booking: AdminBookingSettings;
  email: AdminEmailSettings;
  general: AdminGeneralSettings;
  maintenance: AdminMaintenanceSettings;
  payment: AdminPaymentSettings;
};

export type AdminStaffUserRecord = {
  accountType: "admin" | "customer";
  createdAt: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  name: string;
  phone: string | null;
  role: AdminManagedUserRole;
  userId: string;
};

export type AdminManagedUserRole = AdminRole | "customer";

export type AdminUsersManagerData = {
  counts: {
    active: number;
    admins: number;
    customers: number;
    inactive: number;
    total: number;
  };
  users: AdminStaffUserRecord[];
};
