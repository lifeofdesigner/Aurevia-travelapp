import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {
  ADMIN_PAYMENT_METHOD_KEYS,
  ADMIN_SITE_SETTINGS_SECTIONS
} from "@/features/admin/lib/control-center-types";
import {SITE_THEME_KEYS} from "@/lib/theme/site-themes";
import {CURRENCY_CODES} from "@/types/database-enums";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {saveAdminSiteSettingsSection} from "@/server/admin/control-center-service";

const generalSettingsSchema = z.object({
  businessAddress: z.string().trim().min(1),
  businessCity: z.string().trim().min(1),
  businessCountry: z.string().trim().min(1),
  contactEmail: z.string().trim().email(),
  faviconUrl: z.string().trim().url().nullable().or(z.literal("")),
  logoUrl: z.string().trim().url().nullable().or(z.literal("")),
  siteName: z.string().trim().min(1),
  supportPhone: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  whatsappNumber: z.string().trim().min(1),
  websiteTheme: z.enum(SITE_THEME_KEYS)
}).transform((value) => ({
  ...value,
  businessLocation: [value.businessCity, value.businessCountry].filter(Boolean).join(", "),
  faviconUrl: value.faviconUrl || null,
  logoUrl: value.logoUrl || null
}));

const bookingSettingsSchema = z.object({
  cancellationPolicyText: z.string().trim().min(1),
  defaultCurrency: z.enum(CURRENCY_CODES),
  serviceFeePercentage: z.number().min(0),
  supportedCurrencies: z.array(z.enum(CURRENCY_CODES)).min(1),
  termsAndConditionsUrl: z.string().trim().min(1)
});

const accessSettingsSchema = z.object({
  customerLoginRequiresEmailConfirmation: z.boolean(),
  customerLoginRequiresSmsConfirmation: z.boolean(),
  guestCheckoutEnabled: z.boolean()
});

const emailSettingsSchema = z.object({
  automations: z.object({
    bookingCancellation: z.boolean(),
    bookingConfirmation: z.boolean(),
    bookingReminder: z.boolean(),
    paymentReceipt: z.boolean(),
    visaStatusUpdate: z.boolean(),
    welcome: z.boolean()
  }),
  footerText: z.string().trim().min(1),
  fromEmail: z.string().trim().email(),
  fromName: z.string().trim().min(1),
  replyToEmail: z.string().trim().email()
});

const paymentSettingsSchema = z.object({
  bankTransferDetails: z.string().trim().min(1),
  paymentMethods: z.array(z.enum(ADMIN_PAYMENT_METHOD_KEYS)).min(1),
  refundProcessingDays: z.number().int().min(0)
});

const maintenanceSettingsSchema = z.object({
  allowedIps: z.array(z.string().trim()).default([]),
  enabled: z.boolean(),
  message: z.string().trim().min(1)
});

export async function PATCH(
  request: Request,
  {params}: {params: {section: string}}
) {
  try {
    const actor = await requireAdminApiUser("settings.manage");
    const section = z.enum(ADMIN_SITE_SETTINGS_SECTIONS).parse(params.section);
    const input = await request.json();

    const values =
      section === "general"
        ? generalSettingsSchema.parse(input)
        : section === "booking"
          ? bookingSettingsSchema.parse(input)
          : section === "access"
            ? accessSettingsSchema.parse(input)
            : section === "email"
              ? emailSettingsSchema.parse(input)
              : section === "payment"
                ? paymentSettingsSchema.parse(input)
                : maintenanceSettingsSchema.parse(input);

    await saveAdminSiteSettingsSection({
      actor,
      section,
      values
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/settings`);
      if (section === "general") {
        revalidatePath(`/${locale}`);
        revalidatePath(`/${locale}/admin`);
        revalidatePath(`/${locale}/dashboard`);
      }
    }
    if (section === "general") {
      revalidatePath("/admin-login");
      revalidatePath("/admin-login/forgot-password");
      revalidatePath("/setup");
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid site settings update."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save site settings.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
