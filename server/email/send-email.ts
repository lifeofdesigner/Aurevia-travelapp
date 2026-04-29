import "server-only";

import {Resend} from "resend";

import {buildBookingCancellationEmail} from "@/emails/booking-cancellation";
import {buildBookingConfirmationEmail} from "@/emails/booking-confirmation";
import {buildPaymentReceiptEmail} from "@/emails/payment-receipt";
import {buildVisaStatusUpdateEmail} from "@/emails/visa-status-update";
import {buildWelcomeEmail} from "@/emails/welcome";
import {type Locale} from "@/lib/i18n/routing";
import {type Money} from "@/lib/money";
import {getPublicEnv} from "@/lib/env/client";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type AdminEmailSettings, type AdminEmailTemplatePreview} from "@/features/admin/lib/control-center-types";
import {
  formatBusinessAddressForDocuments,
  getSiteBranding,
  type SiteBranding
} from "@/server/brand/site-branding";
import {type Json} from "@/types/supabase";

export const EMAIL_TEMPLATE_KEYS = [
  "booking_cancellation",
  "booking_confirmation",
  "payment_receipt",
  "visa_status_update",
  "welcome"
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

type BookingConfirmationTemplateData = {
  bookingReference: string;
  bookingTitle: string;
  detailLines: readonly string[];
  locale: Locale;
  passengerNames: readonly string[];
  supportHref: string;
  ticketHref: string;
  totalAmount: Money;
};

type BookingCancellationTemplateData = {
  bookingReference: string;
  locale: Locale;
  refundAmount: Money | null;
  refundTimeline: string;
  supportHref: string;
};

type PaymentReceiptTemplateData = {
  amountPaid: Money;
  bookingReference: string;
  invoiceNumber: string;
  locale: Locale;
  paidAt: string;
  paymentMethod: string;
};

type VisaStatusUpdateTemplateData = {
  applicationReference: string;
  explanation: string;
  locale: Locale;
  nextSteps: readonly string[];
  requiredDocuments: readonly string[];
  statusLabel: string;
};

type WelcomeTemplateData = {
  firstName: string | null;
  locale: Locale;
  quickLinks: {
    dashboard: string;
    flights: string;
    hotels: string;
  };
};

type EmailTemplateDataMap = {
  booking_cancellation: BookingCancellationTemplateData;
  booking_confirmation: BookingConfirmationTemplateData;
  payment_receipt: PaymentReceiptTemplateData;
  visa_status_update: VisaStatusUpdateTemplateData;
  welcome: WelcomeTemplateData;
};

type SendEmailInput<TTemplate extends EmailTemplateKey> = {
  data: EmailTemplateDataMap[TTemplate];
  force?: boolean;
  subject?: string;
  template: TTemplate;
  to: string | string[];
};

type EmailSendResult = {
  id: string;
  provider: "development" | "resend";
  skipped?: boolean;
};

type EmailTemplateSample =
  | {
      data: BookingCancellationTemplateData;
      template: "booking_cancellation";
      title: string;
    }
  | {
      data: BookingConfirmationTemplateData;
      template: "booking_confirmation";
      title: string;
    }
  | {
      data: PaymentReceiptTemplateData;
      template: "payment_receipt";
      title: string;
    }
  | {
      data: VisaStatusUpdateTemplateData;
      template: "visa_status_update";
      title: string;
    }
  | {
      data: WelcomeTemplateData;
      template: "welcome";
      title: string;
    };

function asRecord(value: Json | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readConfiguredFromAddress({
  fallbackEmail,
  fallbackName
}: {
  fallbackEmail: string;
  fallbackName: string;
}) {
  const configuredFrom = process.env.EMAIL_FROM?.trim();
  const configuredName = process.env.EMAIL_FROM_NAME?.trim();

  if (!configuredFrom) {
    return {
      email: fallbackEmail,
      name: configuredName || fallbackName
    };
  }

  const headerMatch = configuredFrom.match(/^(.*)<([^>]+)>$/);

  if (headerMatch) {
    const headerName = headerMatch[1]?.trim().replace(/^"|"$/g, "");

    return {
      email: headerMatch[2]?.trim() || fallbackEmail,
      name: configuredName || headerName || fallbackName
    };
  }

  return {
    email: configuredFrom,
    name: configuredName || fallbackName
  };
}

function rewriteBrandIdentityText(value: string, branding: SiteBranding) {
  const firstBrandWord = branding.siteName.trim().split(/\s+/)[0] || branding.siteName;

  return value
    .replaceAll("Aurevia Travel", branding.siteName)
    .replace(/\bAurevia\b/g, firstBrandWord)
    .replaceAll("Vienna, Austria", branding.businessLocation)
    .replaceAll("Vienna-based", `${branding.businessCity}-based`)
    .replaceAll("from Vienna", `from ${branding.businessCity}`);
}

async function getEmailSettings(): Promise<AdminEmailSettings> {
  const admin = createSupabaseAdminClient();
  const [branding, result] = await Promise.all([
    getSiteBranding(),
    admin
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "admin_site_settings_email")
      .is("locale", null)
      .maybeSingle()
  ]);
  const configuredFrom = readConfiguredFromAddress({
    fallbackEmail: branding.contactEmail,
    fallbackName: branding.siteName
  });
  const value = asRecord((result.data as {setting_value: Json} | null)?.setting_value);
  const automations = asRecord((value.automations as Json | undefined) ?? {});
  const defaultFooter = `${branding.siteName} | ${formatBusinessAddressForDocuments(branding)} | ${branding.contactEmail}`;
  const footerText = typeof value.footerText === "string"
    ? rewriteBrandIdentityText(value.footerText, branding)
    : defaultFooter;
  const fromName = typeof value.fromName === "string"
    ? rewriteBrandIdentityText(value.fromName, branding)
    : configuredFrom.name;

  return {
    automations: {
      bookingCancellation: automations.bookingCancellation !== false,
      bookingConfirmation: automations.bookingConfirmation !== false,
      bookingReminder: automations.bookingReminder !== false,
      paymentReceipt: automations.paymentReceipt !== false,
      visaStatusUpdate: automations.visaStatusUpdate !== false,
      welcome: automations.welcome !== false
    },
    footerText,
    fromEmail:
      typeof value.fromEmail === "string" ? value.fromEmail : configuredFrom.email,
    fromName,
    replyToEmail:
      typeof value.replyToEmail === "string"
        ? value.replyToEmail
        : configuredFrom.email
  };
}

function isTemplateActive(settings: AdminEmailSettings, template: EmailTemplateKey) {
  if (template === "booking_confirmation") {
    return settings.automations.bookingConfirmation;
  }

  if (template === "booking_cancellation") {
    return settings.automations.bookingCancellation;
  }

  if (template === "payment_receipt") {
    return settings.automations.paymentReceipt;
  }

  if (template === "visa_status_update") {
    return settings.automations.visaStatusUpdate;
  }

  return settings.automations.welcome;
}

function renderTemplate<TTemplate extends EmailTemplateKey>(
  template: TTemplate,
  data: EmailTemplateDataMap[TTemplate],
  settings: AdminEmailSettings
) {
  if (template === "booking_confirmation") {
    return buildBookingConfirmationEmail({
      ...data,
      footerText: settings.footerText
    } as BookingConfirmationTemplateData & {footerText: string});
  }

  if (template === "booking_cancellation") {
    return buildBookingCancellationEmail({
      ...data,
      footerText: settings.footerText
    } as BookingCancellationTemplateData & {footerText: string});
  }

  if (template === "payment_receipt") {
    return buildPaymentReceiptEmail({
      ...data,
      footerText: settings.footerText
    } as PaymentReceiptTemplateData & {footerText: string});
  }

  if (template === "visa_status_update") {
    return buildVisaStatusUpdateEmail({
      ...data,
      footerText: settings.footerText
    } as VisaStatusUpdateTemplateData & {footerText: string});
  }

  return buildWelcomeEmail({
    ...data,
    footerText: settings.footerText
  } as WelcomeTemplateData & {footerText: string});
}

export async function sendEmail<TTemplate extends EmailTemplateKey>({
  data,
  force = false,
  subject,
  template,
  to
}: SendEmailInput<TTemplate>): Promise<EmailSendResult> {
  const settings = await getEmailSettings();

  if (!force && !isTemplateActive(settings, template)) {
    return {
      id: `email-skipped-${Date.now()}`,
      provider: "development",
      skipped: true
    };
  }

  const message = renderTemplate(template, data, settings);
  const recipients = Array.isArray(to) ? to : [to];
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    return {
      id: `dev-email-${Date.now()}`,
      provider: "development"
    };
  }

  const resend = new Resend(resendKey);
  const response = await resend.emails.send({
    from: `${settings.fromName} <${settings.fromEmail}>`,
    html: message.html,
    replyTo: settings.replyToEmail,
    subject: subject ?? message.subject,
    text: message.text,
    to: recipients
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    id: response.data?.id ?? "resend-email",
    provider: "resend"
  };
}

function buildAdminEmailTemplateSamples(appUrl: string): EmailTemplateSample[] {
  return [
    {
      data: {
        bookingReference: "AUR-20260428-BOOK",
        bookingTitle: "Lagos to London",
        detailLines: ["15 Jun 2026", "Economy | 1 adult", "Direct service"],
        locale: "en",
        passengerNames: ["Ada Okoye", "Chinedu Okoye"],
        supportHref: `${appUrl}/en/dashboard`,
        ticketHref: `${appUrl}/en/dashboard/bookings/demo`,
        totalAmount: {
          amountMinor: 14500000,
          currency: "NGN"
        }
      },
      template: "booking_confirmation",
      title: "Booking Confirmation"
    },
    {
      data: {
        bookingReference: "AUR-20260428-CANCEL",
        locale: "en",
        refundAmount: {
          amountMinor: 14500000,
          currency: "NGN"
        },
        refundTimeline: "Refunds are processed within 7 business days.",
        supportHref: `${appUrl}/en/dashboard`
      },
      template: "booking_cancellation",
      title: "Booking Cancellation"
    },
    {
      data: {
        amountPaid: {
          amountMinor: 14500000,
          currency: "NGN"
        },
        bookingReference: "AUR-20260428-BOOK",
        invoiceNumber: "INV-20260428-0001",
        locale: "en",
        paidAt: "28 Apr 2026",
        paymentMethod: "Card"
      },
      template: "payment_receipt",
      title: "Payment Receipt"
    },
    {
      data: {
        applicationReference: "VISA-20260428-0001",
        explanation:
          "Your documents have been reviewed and we need one additional file to continue processing.",
        locale: "en",
        nextSteps: [
          "Upload the missing document from your dashboard.",
          "Wait for our review confirmation email."
        ],
        requiredDocuments: ["Updated bank statement"],
        statusLabel: "Needs changes"
      },
      template: "visa_status_update",
      title: "Visa Status Update"
    },
    {
      data: {
        firstName: "Ada",
        locale: "en",
        quickLinks: {
          dashboard: `${appUrl}/en/dashboard`,
          flights: `${appUrl}/en/flights`,
          hotels: `${appUrl}/en/hotels`
        }
      },
      template: "welcome",
      title: "Welcome"
    }
  ];
}

function renderEmailTemplateSample(sample: EmailTemplateSample, settings: AdminEmailSettings) {
  switch (sample.template) {
    case "booking_confirmation":
      return renderTemplate("booking_confirmation", sample.data, settings);
    case "booking_cancellation":
      return renderTemplate("booking_cancellation", sample.data, settings);
    case "payment_receipt":
      return renderTemplate("payment_receipt", sample.data, settings);
    case "visa_status_update":
      return renderTemplate("visa_status_update", sample.data, settings);
    case "welcome":
      return renderTemplate("welcome", sample.data, settings);
  }
}

async function sendEmailTemplateSample(sample: EmailTemplateSample, to: string, subject: string) {
  switch (sample.template) {
    case "booking_confirmation":
      return sendEmail({
        data: sample.data,
        force: true,
        subject,
        template: "booking_confirmation",
        to
      });
    case "booking_cancellation":
      return sendEmail({
        data: sample.data,
        force: true,
        subject,
        template: "booking_cancellation",
        to
      });
    case "payment_receipt":
      return sendEmail({
        data: sample.data,
        force: true,
        subject,
        template: "payment_receipt",
        to
      });
    case "visa_status_update":
      return sendEmail({
        data: sample.data,
        force: true,
        subject,
        template: "visa_status_update",
        to
      });
    case "welcome":
      return sendEmail({
        data: sample.data,
        force: true,
        subject,
        template: "welcome",
        to
      });
  }
}

export async function buildAdminEmailTemplatePreviews(): Promise<AdminEmailTemplatePreview[]> {
  const settings = await getEmailSettings();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const previews = buildAdminEmailTemplateSamples(appUrl);

  return previews.map((preview) => {
    const rendered = renderEmailTemplateSample(preview, settings);

    return {
      html: rendered.html,
      key: preview.template,
      subject: rendered.subject,
      title: preview.title
    };
  });
}

export async function sendAdminTestEmail({
  template,
  to
}: {
  template: EmailTemplateKey;
  to: string;
}) {
  const settings = await getEmailSettings();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const sample = buildAdminEmailTemplateSamples(appUrl).find(
    (entry) => entry.template === template
  );

  if (!sample) {
    throw new Error("The selected email template could not be found.");
  }

  const rendered = renderEmailTemplateSample(sample, settings);

  return sendEmailTemplateSample(sample, to, `[Test] ${rendered.subject}`);
}
