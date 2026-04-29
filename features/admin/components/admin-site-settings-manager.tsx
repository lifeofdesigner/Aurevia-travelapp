"use client";

import {type ChangeEvent, type CSSProperties, type FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {
  type AdminEmailTemplatePreview,
  type AdminPaymentProviderCredentialView,
  type AdminSiteSettingsData,
  type AdminSiteSettingsSection
} from "@/features/admin/lib/control-center-types";
import {SITE_THEME_OPTIONS, type SiteThemeKey} from "@/lib/theme/site-themes";
import {CURRENCY_CODES} from "@/types/database-enums";

type AdminSiteSettingsManagerProps = {
  data: AdminSiteSettingsData;
  emailPreviews: AdminEmailTemplatePreview[];
};

const PAYMENT_METHOD_OPTIONS = [
  {
    description: "International hosted card checkout.",
    label: "Stripe",
    value: "stripe"
  },
  {
    description: "Cards, bank, and USSD for NGN checkout.",
    label: "Paystack",
    value: "paystack"
  },
  {
    description: "Manual account transfer with admin confirmation.",
    label: "Bank transfer",
    value: "bank_transfer"
  },
  {
    description: "Hosted checkout for cards, bank, and mobile money.",
    label: "Flutterwave",
    value: "flutterwave"
  },
  {
    description: "Kora modal checkout for cards and bank rails.",
    label: "Korapay",
    value: "korapay"
  }
] as const;

const SETTINGS_SECTIONS: Array<{
  description: string;
  label: string;
  value: AdminSiteSettingsSection;
}> = [
  {
    description: "Brand, contact, and business details.",
    label: "General",
    value: "general"
  },
  {
    description: "Currencies, fees, and booking policy defaults.",
    label: "Booking",
    value: "booking"
  },
  {
    description: "Customer login approvals and guest checkout.",
    label: "Access",
    value: "access"
  },
  {
    description: "Transactional email behavior and previews.",
    label: "Emails",
    value: "email"
  },
  {
    description: "Payment rails and refund settings.",
    label: "Payments",
    value: "payment"
  },
  {
    description: "Maintenance mode and allowlist controls.",
    label: "Maintenance",
    value: "maintenance"
  }
] as const;

function readCheckboxValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function AdminSiteSettingsManager({
  data,
  emailPreviews
}: AdminSiteSettingsManagerProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSiteSettingsSection>("general");
  const [pendingSection, setPendingSection] = useState<AdminSiteSettingsSection | null>(null);
  const [pendingCredentialKey, setPendingCredentialKey] = useState<string | null>(null);
  const [pendingTestTemplate, setPendingTestTemplate] =
    useState<AdminEmailTemplatePreview["key"] | null>(null);
  const [pendingBrandAsset, setPendingBrandAsset] = useState<"favicon" | "logo" | null>(null);
  const [generalAssets, setGeneralAssets] = useState({
    faviconUrl: data.general.faviconUrl,
    logoUrl: data.general.logoUrl
  });

  async function saveSection(section: AdminSiteSettingsSection, payload: unknown) {
    setPendingSection(section);

    try {
      const response = await fetch(`/api/admin/site-settings/${section}`, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      });
      const payloadResult = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payloadResult.message ?? "Unable to save the settings section.");
      }

      toast.success("Settings saved", {
        description: "The operational settings section has been updated."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save settings", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingSection(null);
    }
  }

  async function sendTestEmail(template: AdminEmailTemplatePreview["key"]) {
    setPendingTestTemplate(template);

    try {
      const response = await fetch("/api/admin/email/test", {
        body: JSON.stringify({template}),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payloadResult = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payloadResult.message ?? "Unable to send the test email.");
      }

      toast.success("Test email sent", {
        description: "A preview copy has been sent to your signed-in admin inbox."
      });
    } catch (error) {
      toast.error("Unable to send test email", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingTestTemplate(null);
    }
  }

  async function uploadBrandAsset(
    event: ChangeEvent<HTMLInputElement>,
    assetType: "favicon" | "logo"
  ) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setPendingBrandAsset(assetType);

    try {
      const uploadBody = new FormData();
      uploadBody.append("assetType", assetType);
      uploadBody.append("file", file);

      const response = await fetch("/api/admin/site-settings/assets", {
        body: uploadBody,
        method: "POST"
      });
      const payloadResult = (await response.json()) as {message?: string; url?: string};

      if (!response.ok || !payloadResult.url) {
        throw new Error(payloadResult.message ?? "Unable to upload the brand asset.");
      }

      setGeneralAssets((current) => ({
        ...current,
        [assetType === "logo" ? "logoUrl" : "faviconUrl"]: payloadResult.url ?? null
      }));
      toast.success(assetType === "logo" ? "Logo uploaded" : "Favicon uploaded", {
        description: "Save general settings to publish this brand asset."
      });
    } catch (error) {
      toast.error("Unable to upload brand asset", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      event.currentTarget.value = "";
      setPendingBrandAsset(null);
    }
  }

  async function savePaymentCredentials(
    event: FormEvent<HTMLFormElement>,
    provider: AdminPaymentProviderCredentialView["key"]
  ) {
    event.preventDefault();
    setPendingCredentialKey(provider);

    try {
      const formData = new FormData(event.currentTarget);
      const secretValues: Record<string, string> = {};

      for (const [fieldName, value] of formData.entries()) {
        if (fieldName === "environment") {
          continue;
        }

        if (typeof value === "string") {
          secretValues[fieldName] = value;
        }
      }

      const response = await fetch(`/api/admin/payment-method-credentials/${provider}`, {
        body: JSON.stringify({
          environment: formData.get("environment"),
          secretValues
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      });
      const payloadResult = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payloadResult.message ?? "Unable to save payment credentials.");
      }

      toast.success("Payment credentials saved", {
        description: "Keys were encrypted and the provider environment was updated."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save payment credentials", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingCredentialKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/80 bg-card p-2 shadow-soft">
        <div className="grid gap-2 lg:grid-cols-6">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = activeSection === section.value;

            return (
              <button
                key={section.value}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[#c9a84c] bg-[#f0ebe0] text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border/80 hover:bg-background/70 hover:text-foreground"
                }`}
                onClick={() => setActiveSection(section.value)}
                type="button"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {section.label}
                </p>
                <p className="mt-1 text-xs leading-5">{section.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "general" ? (
        <form
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void saveSection("general", {
              businessAddress: String(formData.get("businessAddress") ?? ""),
              businessCity: String(formData.get("businessCity") ?? ""),
              businessCountry: String(formData.get("businessCountry") ?? ""),
              contactEmail: String(formData.get("contactEmail") ?? ""),
              faviconUrl: generalAssets.faviconUrl,
              logoUrl: generalAssets.logoUrl,
              siteName: String(formData.get("siteName") ?? ""),
              supportPhone: String(formData.get("supportPhone") ?? ""),
              tagline: String(formData.get("tagline") ?? ""),
              whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
              websiteTheme: String(formData.get("websiteTheme") ?? data.general.websiteTheme) as SiteThemeKey
            });
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">General</h2>
            <p className="text-sm text-muted-foreground">
              Core brand and contact settings shown across the website and emails.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="general-site-name">Business name</Label>
              <Input defaultValue={data.general.siteName} id="general-site-name" name="siteName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-tagline">Tagline</Label>
              <Input defaultValue={data.general.tagline} id="general-tagline" name="tagline" />
            </div>
            <fieldset className="space-y-3 lg:col-span-2">
              <legend className="text-sm font-medium text-foreground">Website color theme</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {SITE_THEME_OPTIONS.map((theme) => (
                  <label
                    key={theme.key}
                    className="group flex cursor-pointer flex-col gap-4 rounded-lg border border-border/80 bg-background/70 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-secondary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{theme.label}</span>
                      <input
                        className="h-4 w-4 accent-[var(--theme-radio-accent)]"
                        defaultChecked={data.general.websiteTheme === theme.key}
                        name="websiteTheme"
                        type="radio"
                        value={theme.key}
                        style={{"--theme-radio-accent": theme.primaryHex} as CSSProperties}
                      />
                    </div>
                    <span className="text-xs leading-5 text-muted-foreground">
                      {theme.description}
                    </span>
                    <span className="grid h-10 grid-cols-3 overflow-hidden rounded-md border border-border/70">
                      <span style={{backgroundColor: theme.primaryHex}} />
                      <span style={{backgroundColor: theme.accentHex}} />
                      <span style={{backgroundColor: theme.surfaceHex}} />
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Each theme uses high-contrast foreground, button, border, and mobile navigation colors for airline-style corporate interfaces.
              </p>
            </fieldset>
            <div className="space-y-2 lg:col-span-2">
              <Label>Brand logo</Label>
              <div className="grid gap-4 rounded-lg border border-border/80 bg-background/70 p-4 md:grid-cols-[180px_1fr]">
                <div
                  aria-label="Current brand logo preview"
                  className="flex h-24 items-center justify-center rounded-md border border-border/80 bg-[#1c3d2e] bg-contain bg-center bg-no-repeat px-4 text-center text-sm font-semibold text-[#e8dfc8]"
                  style={
                    generalAssets.logoUrl
                      ? {backgroundImage: `url(${generalAssets.logoUrl})`}
                      : undefined
                  }
                >
                  {generalAssets.logoUrl ? null : data.general.siteName}
                </div>
                <div className="space-y-3">
                  <Input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={pendingBrandAsset === "logo"}
                    onChange={(event) => void uploadBrandAsset(event, "logo")}
                    type="file"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Upload a transparent PNG, JPG, or WebP logo. It will appear in the site header, footer, browser metadata, and branded documents after saving.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      readOnly
                      value={generalAssets.logoUrl ?? ""}
                      placeholder="No logo uploaded yet"
                    />
                    {generalAssets.logoUrl ? (
                      <Button
                        className="border border-border/80 bg-background text-foreground hover:bg-muted"
                        onClick={() => setGeneralAssets((current) => ({...current, logoUrl: null}))}
                        type="button"
                      >
                        Clear logo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Favicon</Label>
              <div className="grid gap-4 rounded-lg border border-border/80 bg-background/70 p-4 md:grid-cols-[96px_1fr]">
                <div
                  aria-label="Current favicon preview"
                  className="flex h-20 w-20 items-center justify-center rounded-md border border-border/80 bg-white bg-contain bg-center bg-no-repeat text-xs font-semibold text-[#1c3d2e]"
                  style={
                    generalAssets.faviconUrl
                      ? {backgroundImage: `url(${generalAssets.faviconUrl})`}
                      : undefined
                  }
                >
                  {generalAssets.faviconUrl ? null : "Icon"}
                </div>
                <div className="space-y-3">
                  <Input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={pendingBrandAsset === "favicon"}
                    onChange={(event) => void uploadBrandAsset(event, "favicon")}
                    type="file"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Use a square PNG/WebP image for best browser support. Save general settings after upload to make it the active favicon.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      readOnly
                      value={generalAssets.faviconUrl ?? ""}
                      placeholder="No favicon uploaded yet"
                    />
                    {generalAssets.faviconUrl ? (
                      <Button
                        className="border border-border/80 bg-background text-foreground hover:bg-muted"
                        onClick={() => setGeneralAssets((current) => ({...current, faviconUrl: null}))}
                        type="button"
                      >
                        Clear favicon
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-contact-email">Contact email</Label>
              <Input
                defaultValue={data.general.contactEmail}
                id="general-contact-email"
                name="contactEmail"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-support-phone">Support phone</Label>
              <Input
                defaultValue={data.general.supportPhone}
                id="general-support-phone"
                name="supportPhone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-whatsapp">WhatsApp number</Label>
              <Input
                defaultValue={data.general.whatsappNumber}
                id="general-whatsapp"
                name="whatsappNumber"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-business-city">Business city</Label>
              <Input
                defaultValue={data.general.businessCity}
                id="general-business-city"
                name="businessCity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-business-country">Business country</Label>
              <Input
                defaultValue={data.general.businessCountry}
                id="general-business-country"
                name="businessCountry"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="general-business-address">Business address</Label>
              <Textarea
                className="rounded-lg"
                defaultValue={data.general.businessAddress}
                id="general-business-address"
                name="businessAddress"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                City and country are shown across the public footer, browser metadata, invoices, e-tickets, and booking PDFs.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSection === "general"}
              type="submit"
            >
              {pendingSection === "general" ? "Saving..." : "Save general settings"}
            </Button>
          </div>
        </form>
      ) : null}

      {activeSection === "booking" ? (
        <form
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void saveSection("booking", {
              cancellationPolicyText: String(formData.get("cancellationPolicyText") ?? ""),
              defaultCurrency: String(formData.get("defaultCurrency") ?? "EUR"),
              serviceFeePercentage: Number(formData.get("serviceFeePercentage") ?? 0),
              supportedCurrencies: readCheckboxValues(formData, "supportedCurrencies"),
              termsAndConditionsUrl: String(formData.get("termsAndConditionsUrl") ?? "")
            });
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">Booking Settings</h2>
            <p className="text-sm text-muted-foreground">
              Default checkout rules, supported currencies, and policy messaging.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-default-currency">Default currency</Label>
              <Select
                defaultValue={data.booking.defaultCurrency}
                id="booking-default-currency"
                name="defaultCurrency"
              >
                {CURRENCY_CODES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-service-fee">Service fee percentage</Label>
              <Input
                defaultValue={data.booking.serviceFeePercentage}
                id="booking-service-fee"
                min={0}
                name="serviceFeePercentage"
                step="0.1"
                type="number"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Supported currencies</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {CURRENCY_CODES.map((currency) => (
                  <label key={currency} className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                    <input
                      defaultChecked={data.booking.supportedCurrencies.includes(currency)}
                      name="supportedCurrencies"
                      type="checkbox"
                      value={currency}
                    />
                    <span>{currency}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="booking-cancellation-policy">Cancellation policy text</Label>
              <Textarea
                className="rounded-lg"
                defaultValue={data.booking.cancellationPolicyText}
                id="booking-cancellation-policy"
                name="cancellationPolicyText"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="booking-terms-url">Terms and conditions URL</Label>
              <Input
                defaultValue={data.booking.termsAndConditionsUrl}
                id="booking-terms-url"
                name="termsAndConditionsUrl"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSection === "booking"}
              type="submit"
            >
              {pendingSection === "booking" ? "Saving..." : "Save booking settings"}
            </Button>
          </div>
        </form>
      ) : null}

      {activeSection === "access" ? (
        <form
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void saveSection("access", {
              customerLoginRequiresEmailConfirmation:
                formData.get("customerLoginRequiresEmailConfirmation") === "on",
              customerLoginRequiresSmsConfirmation:
                formData.get("customerLoginRequiresSmsConfirmation") === "on",
              guestCheckoutEnabled: formData.get("guestCheckoutEnabled") === "on"
            });
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">Access Settings</h2>
            <p className="text-sm text-muted-foreground">
              Decide how customer login approval, confirmation checks, and guest checkout should work.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <label className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm text-foreground">
              <span className="flex items-center gap-3">
                <input
                  defaultChecked={data.access.customerLoginRequiresEmailConfirmation}
                  name="customerLoginRequiresEmailConfirmation"
                  type="checkbox"
                />
                <span className="font-medium">Require email confirmation</span>
              </span>
              <span className="mt-2 block leading-6 text-muted-foreground">
                When off, admin-approved customers are allowed to log in even if Supabase has not confirmed their email yet.
              </span>
            </label>
            <label className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm text-foreground">
              <span className="flex items-center gap-3">
                <input
                  defaultChecked={data.access.customerLoginRequiresSmsConfirmation}
                  name="customerLoginRequiresSmsConfirmation"
                  type="checkbox"
                />
                <span className="font-medium">Require SMS confirmation</span>
              </span>
              <span className="mt-2 block leading-6 text-muted-foreground">
                When on, customers with phone-based access must have a confirmed phone before password login is accepted.
              </span>
            </label>
            <label className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm text-foreground">
              <span className="flex items-center gap-3">
                <input
                  defaultChecked={data.access.guestCheckoutEnabled}
                  name="guestCheckoutEnabled"
                  type="checkbox"
                />
                <span className="font-medium">Allow guest checkout</span>
              </span>
              <span className="mt-2 block leading-6 text-muted-foreground">
                When on, visitors can create a temporary customer session from booking contact details and continue to payment.
              </span>
            </label>
          </div>
          <div className="mt-6">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSection === "access"}
              type="submit"
            >
              {pendingSection === "access" ? "Saving..." : "Save access settings"}
            </Button>
          </div>
        </form>
      ) : null}

      {activeSection === "email" ? (
        <form
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void saveSection("email", {
              automations: {
                bookingCancellation: formData.get("bookingCancellation") === "on",
                bookingConfirmation: formData.get("bookingConfirmation") === "on",
                bookingReminder: formData.get("bookingReminder") === "on",
                paymentReceipt: formData.get("paymentReceipt") === "on",
                visaStatusUpdate: formData.get("visaStatusUpdate") === "on",
                welcome: formData.get("welcome") === "on"
              },
              footerText: String(formData.get("footerText") ?? ""),
              fromEmail: String(formData.get("fromEmail") ?? ""),
              fromName: String(formData.get("fromName") ?? ""),
              replyToEmail: String(formData.get("replyToEmail") ?? "")
            });
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">Email Settings</h2>
            <p className="text-sm text-muted-foreground">
              Sender identity, footer copy, automation toggles, and branded template previews.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-from-name">From name</Label>
              <Input defaultValue={data.email.fromName} id="email-from-name" name="fromName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-from-email">From email</Label>
              <Input
                defaultValue={data.email.fromEmail}
                id="email-from-email"
                name="fromEmail"
                type="email"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="email-reply-to">Reply-to email</Label>
              <Input
                defaultValue={data.email.replyToEmail}
                id="email-reply-to"
                name="replyToEmail"
                type="email"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="email-footer">Email footer text</Label>
              <Textarea
                className="rounded-lg"
                defaultValue={data.email.footerText}
                id="email-footer"
                name="footerText"
              />
            </div>
            <div className="space-y-3 lg:col-span-2">
              <Label>Automatic emails</Label>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.bookingConfirmation}
                    name="bookingConfirmation"
                    type="checkbox"
                  />
                  <span>Booking confirmation</span>
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.bookingCancellation}
                    name="bookingCancellation"
                    type="checkbox"
                  />
                  <span>Cancellation email</span>
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.bookingReminder}
                    name="bookingReminder"
                    type="checkbox"
                  />
                  <span>Reminder email</span>
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.paymentReceipt}
                    name="paymentReceipt"
                    type="checkbox"
                  />
                  <span>Payment receipt</span>
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.visaStatusUpdate}
                    name="visaStatusUpdate"
                    type="checkbox"
                  />
                  <span>Visa status update</span>
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground">
                  <input
                    defaultChecked={data.email.automations.welcome}
                    name="welcome"
                    type="checkbox"
                  />
                  <span>Welcome email</span>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSection === "email"}
              type="submit"
            >
              {pendingSection === "email" ? "Saving..." : "Save email settings"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Test emails are always sent to your signed-in admin address.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-xl italic text-foreground">Template previews</h3>
              <p className="text-sm text-muted-foreground">
                Review the live branded layouts and send yourself a test copy at any time.
              </p>
            </div>
            <div className="grid gap-4 2xl:grid-cols-2">
              {emailPreviews.map((preview) => (
                <article
                  key={preview.key}
                  className="rounded-lg border border-border/80 bg-background/60 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-foreground">{preview.title}</h4>
                      <p className="text-sm text-muted-foreground">{preview.subject}</p>
                    </div>
                    <Button
                      className="bg-[#c9a84c] text-[#1c3d2e] hover:bg-[#b99536]"
                      disabled={pendingTestTemplate === preview.key}
                      onClick={() => void sendTestEmail(preview.key)}
                      type="button"
                    >
                      {pendingTestTemplate === preview.key ? "Sending..." : "Send test email"}
                    </Button>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-lg border border-border/80 bg-white">
                    <iframe
                      className="h-[420px] w-full bg-white"
                      srcDoc={preview.html}
                      title={`${preview.title} preview`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </form>
      ) : null}

      {activeSection === "payment" ? (
        <div className="space-y-6">
          <form
            className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              void saveSection("payment", {
                bankTransferDetails: String(formData.get("bankTransferDetails") ?? ""),
                paymentMethods: readCheckboxValues(formData, "paymentMethods"),
                refundProcessingDays: Number(formData.get("refundProcessingDays") ?? 0)
              });
            }}
          >
            <div className="space-y-2">
              <h2 className="font-display text-2xl italic text-foreground">Payment Settings</h2>
              <p className="text-sm text-muted-foreground">
                Active payment rails, bank transfer instructions, provider keys, and refund SLA controls.
              </p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 lg:col-span-2">
                <Label>Active payment methods</Label>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <label
                      key={method.value}
                      className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm text-foreground"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          defaultChecked={data.payment.paymentMethods.includes(method.value)}
                          name="paymentMethods"
                          type="checkbox"
                          value={method.value}
                        />
                        <span className="font-medium">{method.label}</span>
                      </span>
                      <span className="mt-2 block leading-6 text-muted-foreground">
                        {method.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-refund-days">Refund processing time (days)</Label>
                <Input
                  defaultValue={data.payment.refundProcessingDays}
                  id="payment-refund-days"
                  min={0}
                  name="refundProcessingDays"
                  type="number"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="payment-bank-transfer-details">Bank transfer details</Label>
                <Textarea
                  className="min-h-36 rounded-lg"
                  defaultValue={data.payment.bankTransferDetails}
                  id="payment-bank-transfer-details"
                  name="bankTransferDetails"
                />
                <p className="text-xs text-muted-foreground">
                  These instructions are shown to customers when Bank transfer is active at checkout.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button
                className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                disabled={pendingSection === "payment"}
                type="submit"
              >
                {pendingSection === "payment" ? "Saving..." : "Save payment settings"}
              </Button>
            </div>
          </form>

          <section className="rounded-lg border border-border/80 bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <h3 className="font-display text-xl italic text-foreground">
                Payment Provider Keys
              </h3>
              <p className="text-sm text-muted-foreground">
                Store test or live credentials for active gateways. Secret keys are encrypted and only the last four characters are shown after saving.
              </p>
            </div>
            <div className="mt-6 grid gap-4 2xl:grid-cols-2">
              {(data.payment.providerCredentials ?? []).map((provider) => (
                <form
                  key={provider.key}
                  className="rounded-lg border border-border/80 bg-background/70 p-4"
                  onSubmit={(event) => savePaymentCredentials(event, provider.key)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {provider.title}
                        </h4>
                        <StatusBadge
                          label={formatStatusLabel(provider.status)}
                          status={
                            provider.status === "connected"
                              ? "confirmed"
                              : provider.status === "failed"
                                ? "failed"
                                : "draft"
                          }
                        />
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground">
                      <p>Last tested</p>
                      <p className="mt-1 font-medium text-foreground">
                        {provider.lastTestedAt
                          ? new Date(provider.lastTestedAt).toLocaleString()
                          : "Not tested yet"}
                      </p>
                    </div>
                  </div>

                  {provider.lastTestMessage ? (
                    <p className="mt-4 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground">
                      {provider.lastTestMessage}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`payment-${provider.key}-environment`}>Environment</Label>
                      <Select
                        defaultValue={provider.environment}
                        id={`payment-${provider.key}-environment`}
                        name="environment"
                      >
                        <option value="test">Test</option>
                        <option value="live">Live</option>
                      </Select>
                    </div>
                    {provider.fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label htmlFor={`payment-${provider.key}-${field.name}`}>
                          {field.label}
                        </Label>
                        <Input
                          autoComplete="off"
                          id={`payment-${provider.key}-${field.name}`}
                          name={field.name}
                          placeholder={
                            field.maskedValue
                              ? `Saved value ending in ${field.maskedValue}`
                              : field.placeholder
                          }
                          type="password"
                        />
                        <p className="text-xs text-muted-foreground">
                          {field.maskedValue
                            ? "Leave blank to keep the saved encrypted value."
                            : "Required before this provider can process real checkout."}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button
                      className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                      disabled={pendingCredentialKey === provider.key}
                      type="submit"
                    >
                      {pendingCredentialKey === provider.key ? "Saving..." : `Save ${provider.title} keys`}
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "maintenance" ? (
        <form
          className="rounded-lg border border-border/80 bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void saveSection("maintenance", {
              allowedIps: String(formData.get("allowedIps") ?? "")
                .split(/\r?\n/)
                .map((value) => value.trim())
                .filter(Boolean),
              enabled: formData.get("enabled") === "on",
              message: String(formData.get("message") ?? "")
            });
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl italic text-foreground">Maintenance</h2>
            <p className="text-sm text-muted-foreground">
              Maintenance mode messaging and allowlist controls for internal access.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground lg:col-span-2">
              <input defaultChecked={data.maintenance.enabled} name="enabled" type="checkbox" />
              <span>Enable maintenance mode</span>
            </label>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="maintenance-message">Maintenance message</Label>
              <Textarea
                className="rounded-lg"
                defaultValue={data.maintenance.message}
                id="maintenance-message"
                name="message"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="maintenance-allowed-ips">Allowed IPs</Label>
              <Textarea
                className="rounded-lg"
                defaultValue={data.maintenance.allowedIps.join("\n")}
                id="maintenance-allowed-ips"
                name="allowedIps"
                placeholder="One IP address per line"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={pendingSection === "maintenance"}
              type="submit"
            >
              {pendingSection === "maintenance" ? "Saving..." : "Save maintenance settings"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
