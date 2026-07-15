import "server-only";

import {getServerEnv} from "@/lib/env/server";
import {normalizeSiteTheme, type SiteThemeKey} from "@/lib/theme/site-themes";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

export const SITE_GENERAL_SETTINGS_KEY = "admin_site_settings_general";

export type TicketLogoSize = "small" | "medium" | "large";

export type SiteBranding = {
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
  ticketLogoSize: TicketLogoSize;
  whatsappNumber: string;
  websiteTheme: SiteThemeKey;
};

function asRecord(value: Json | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalUrl(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function ticketLogoSizeValue(value: unknown): TicketLogoSize {
  return value === "small" || value === "medium" || value === "large" ? value : "medium";
}

function splitAddressLocation(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const [firstPart = "Vienna"] = parts;

  return {
    city: firstPart,
    country: parts.length > 1 ? parts[parts.length - 1] || "Austria" : "Austria"
  };
}

export function formatBusinessLocation({
  businessCity,
  businessCountry
}: Pick<SiteBranding, "businessCity" | "businessCountry">) {
  return [businessCity, businessCountry].map((value) => value.trim()).filter(Boolean).join(", ");
}

export function formatBusinessAddressForDocuments({
  businessAddress,
  businessLocation
}: Pick<SiteBranding, "businessAddress" | "businessLocation">) {
  const address = businessAddress.trim();

  if (!address) {
    return businessLocation;
  }

  if (businessLocation && address.toLowerCase().includes(businessLocation.toLowerCase())) {
    return address;
  }

  return [address, businessLocation].filter(Boolean).join(", ");
}

export function getDefaultSiteBranding(): SiteBranding {
  const env = getServerEnv();
  const location = splitAddressLocation(env.AUREVIA_COMPANY_ADDRESS);
  const businessLocation = formatBusinessLocation({
    businessCity: location.city,
    businessCountry: location.country
  });

  return {
    businessAddress: env.AUREVIA_COMPANY_ADDRESS,
    businessCity: location.city,
    businessCountry: location.country,
    businessLocation,
    contactEmail: env.AUREVIA_COMPANY_EMAIL,
    faviconUrl: null,
    logoUrl: null,
    siteName: env.AUREVIA_COMPANY_NAME,
    supportPhone: "+43 1 000 0000",
    tagline: "Curated global journeys for modern travelers.",
    ticketLogoSize: "medium" as TicketLogoSize,
    whatsappNumber: "+43 660 000 0000",
    websiteTheme: "executive_emerald"
  };
}

export function normalizeSiteBranding(value: Json | null | undefined): SiteBranding {
  const defaults = getDefaultSiteBranding();
  const record = asRecord(value);
  const businessAddress = stringValue(record.businessAddress, defaults.businessAddress);
  const legacyLocation =
    typeof record.businessLocation === "string" && record.businessLocation.trim()
      ? record.businessLocation.trim()
      : businessAddress;
  const derivedLocation = splitAddressLocation(legacyLocation);
  const businessCity = stringValue(record.businessCity, derivedLocation.city || defaults.businessCity);
  const businessCountry = stringValue(
    record.businessCountry,
    derivedLocation.country || defaults.businessCountry
  );
  const businessLocation = formatBusinessLocation({
    businessCity,
    businessCountry
  });

  return {
    businessAddress,
    businessCity,
    businessCountry,
    businessLocation,
    contactEmail: stringValue(record.contactEmail, defaults.contactEmail),
    faviconUrl: optionalUrl(record.faviconUrl),
    logoUrl: optionalUrl(record.logoUrl),
    siteName: stringValue(record.siteName, defaults.siteName),
    supportPhone: stringValue(record.supportPhone, defaults.supportPhone),
    tagline: stringValue(record.tagline, defaults.tagline),
    ticketLogoSize: ticketLogoSizeValue(record.ticketLogoSize),
    whatsappNumber: stringValue(record.whatsappNumber, defaults.whatsappNumber),
    websiteTheme: normalizeSiteTheme(record.websiteTheme)
  };
}

export async function getSiteBranding(): Promise<SiteBranding> {
  try {
    const admin = createSupabaseAdminClient();
    const result = await admin
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", SITE_GENERAL_SETTINGS_KEY)
      .is("locale", null)
      .maybeSingle();

    return normalizeSiteBranding(
      (result.data as {setting_value: Json} | null)?.setting_value
    );
  } catch {
    return getDefaultSiteBranding();
  }
}

export function buildMetadataIcons(faviconUrl: string | null) {
  if (!faviconUrl) {
    return undefined;
  }

  return {
    apple: [{url: faviconUrl}],
    icon: [{url: faviconUrl}],
    shortcut: [{url: faviconUrl}]
  };
}
