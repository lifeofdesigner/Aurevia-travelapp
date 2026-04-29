import "server-only";

import {createHash} from "crypto";

import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";
import {createAdminAuditLog} from "@/server/admin/audit";
import {getDefaultSiteBranding} from "@/server/brand/site-branding";
import {type AdminStaffIdentity} from "@/features/admin/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";
import type {
  AdminHomepageBannerRecord,
  AdminHomepageData,
  AdminHomepageDealRecord,
  AdminHomepageDestinationRecord,
  AdminHomepageHeroRecord,
  AdminHomepageSettingsRecord,
  AdminHomepageStatRecord
} from "@/features/admin/lib/homepage-types";

import {getHomepageData} from "./get-homepage-data";

const HOMEPAGE_IMAGE_BUCKET = "homepage-assets";
const HOMEPAGE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const HOMEPAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function parseJsonText<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asJson(value: unknown) {
  return value as Json;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

function normalizeTrustItems(items: string[]) {
  const normalized = items.map((item) => item.trim()).filter(Boolean);

  while (normalized.length < 5) {
    normalized.push("");
  }

  return normalized.slice(0, 5);
}

function normalizeStats(stats: AdminHomepageStatRecord[]) {
  const normalized = stats
    .filter((stat) => typeof stat.value === "string" || typeof stat.label === "string")
    .map((stat) => ({
      label: stat.label?.trim?.() ?? "",
      value: stat.value?.trim?.() ?? ""
    }));

  while (normalized.length < 3) {
    normalized.push({label: "", value: ""});
  }

  return normalized.slice(0, 3);
}

function mapBannerRecord(record: {
  cta_link: string | null;
  cta_text: string | null;
  ends_at: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  subtitle: string | null;
  title: string;
}): AdminHomepageBannerRecord {
  return {
    ctaLink: record.cta_link,
    ctaText: record.cta_text,
    endsAt: record.ends_at,
    id: record.id,
    imageUrl: record.image_url,
    isActive: record.is_active,
    sortOrder: record.sort_order,
    startsAt: record.starts_at,
    subtitle: record.subtitle,
    title: record.title
  };
}

function mapDestinationRecord(record: {
  city: string;
  country: string;
  hotels_count: number | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  link: string | null;
  price_label: string | null;
  sort_order: number;
}): AdminHomepageDestinationRecord {
  return {
    city: record.city,
    country: record.country,
    hotelsCount: record.hotels_count,
    id: record.id,
    imageUrl: record.image_url,
    isActive: record.is_active,
    link: record.link,
    priceLabel: record.price_label,
    sortOrder: record.sort_order
  };
}

function mapDealRecord(record: {
  airline_name: string;
  currency: SupportedCurrency;
  destination_city: string;
  destination_code: string;
  expires_at: string | null;
  fare_type: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  origin_city: string;
  origin_code: string;
  price: number;
  sort_order: number;
}): AdminHomepageDealRecord {
  return {
    airlineName: record.airline_name,
    currency: record.currency,
    destinationCity: record.destination_city,
    destinationCode: record.destination_code,
    expiresAt: record.expires_at,
    fareType: record.fare_type,
    id: record.id,
    imageUrl: record.image_url,
    isActive: record.is_active,
    originCity: record.origin_city,
    originCode: record.origin_code,
    price: record.price,
    sortOrder: record.sort_order
  };
}

function mapHeroRecord(
  record:
    | {
        bg_image_url: string | null;
        cta_link: string;
        cta_text: string;
        headline: string;
        id: string;
        subheadline: string;
      }
    | null
    | undefined,
  fallback: {
    bgImageUrl: string | null;
    ctaLink: string;
    ctaText: string;
    headline: string;
    subheadline: string;
  }
): AdminHomepageHeroRecord {
  return {
    bgImageUrl: record?.bg_image_url ?? fallback.bgImageUrl,
    ctaLink: record?.cta_link ?? fallback.ctaLink,
    ctaText: record?.cta_text ?? fallback.ctaText,
    headline: record?.headline ?? fallback.headline,
    id: record?.id ?? null,
    subheadline: record?.subheadline ?? fallback.subheadline
  };
}

function normalizeSettings(
  settings:
    | Array<{
        key: string;
        value: string;
      }>
    | null
    | undefined,
  fallback: {
    ctaDescription: string;
    ctaHeadline: string;
    footerTagline: string;
    stats: AdminHomepageStatRecord[];
    trustItems: string[];
    whyDescription: string;
    whyHeadline: string;
  }
): AdminHomepageSettingsRecord {
  const settingsMap = new Map(settings?.map((setting) => [setting.key, setting.value]) ?? []);
  const trustItems = normalizeTrustItems(
    parseJsonText<string[]>(settingsMap.get("trust_items"), fallback.trustItems)
  );
  const stats = normalizeStats(
    parseJsonText<AdminHomepageStatRecord[]>(settingsMap.get("stats"), fallback.stats)
  );
  const why = parseJsonText<{description?: string; headline?: string}>(
    settingsMap.get("why_text"),
    {}
  );
  const cta = parseJsonText<{description?: string; headline?: string}>(
    settingsMap.get("cta_text"),
    {}
  );

  return {
    ctaDescription: cta.description ?? fallback.ctaDescription,
    ctaHeadline: cta.headline ?? fallback.ctaHeadline,
    footerTagline: settingsMap.get("footer_tagline") ?? fallback.footerTagline,
    stats,
    trustItems,
    whyDescription: why.description ?? fallback.whyDescription,
    whyHeadline: why.headline ?? fallback.whyHeadline
  };
}

async function ensureHomepageAssetsBucket() {
  const admin = createSupabaseAdminClient();
  const createResult = await admin.storage.createBucket(HOMEPAGE_IMAGE_BUCKET, {
    allowedMimeTypes: [...HOMEPAGE_IMAGE_MIME_TYPES],
    fileSizeLimit: HOMEPAGE_IMAGE_MAX_BYTES,
    public: true
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
    throw new Error(createResult.error.message);
  }
}

export async function getAdminHomepageData(locale: Locale): Promise<AdminHomepageData> {
  const fallbackData = await getHomepageData(locale);
  const defaultBranding = getDefaultSiteBranding();
  const admin = createSupabaseAdminClient();
  const [heroResult, bannersResult, destinationsResult, dealsResult, settingsResult] =
    await Promise.all([
      admin
        .from("homepage_hero")
        .select("id, headline, subheadline, cta_text, cta_link, bg_image_url")
        .order("updated_at", {ascending: false})
        .limit(1)
        .maybeSingle(),
      admin
        .from("homepage_banners")
        .select(
          "id, title, subtitle, image_url, cta_text, cta_link, sort_order, is_active, starts_at, ends_at"
        )
        .order("sort_order", {ascending: true}),
      admin
        .from("homepage_destinations")
        .select(
          "id, city, country, image_url, price_label, hotels_count, link, sort_order, is_active"
        )
        .order("sort_order", {ascending: true}),
      admin
        .from("homepage_deals")
        .select(
          "id, origin_code, origin_city, destination_code, destination_city, price, currency, airline_name, image_url, fare_type, expires_at, sort_order, is_active"
        )
        .order("sort_order", {ascending: true}),
      admin.from("homepage_settings").select("key, value")
    ]);

  return {
    banners:
      ((bannersResult.data as Array<{
        cta_link: string | null;
        cta_text: string | null;
        ends_at: string | null;
        id: string;
        image_url: string | null;
        is_active: boolean;
        sort_order: number;
        starts_at: string | null;
        subtitle: string | null;
        title: string;
      }> | null) ?? []).map(mapBannerRecord),
    deals:
      ((dealsResult.data as Array<{
        airline_name: string;
        currency: SupportedCurrency;
        destination_city: string;
        destination_code: string;
        expires_at: string | null;
        fare_type: string | null;
        id: string;
        image_url: string | null;
        is_active: boolean;
        origin_city: string;
        origin_code: string;
        price: number;
        sort_order: number;
      }> | null) ?? []).map(mapDealRecord),
    destinations:
      ((destinationsResult.data as Array<{
        city: string;
        country: string;
        hotels_count: number | null;
        id: string;
        image_url: string | null;
        is_active: boolean;
        link: string | null;
        price_label: string | null;
        sort_order: number;
      }> | null) ?? []).map(mapDestinationRecord),
    hero: mapHeroRecord(
      (heroResult.data as {
        bg_image_url: string | null;
        cta_link: string;
        cta_text: string;
        headline: string;
        id: string;
        subheadline: string;
      } | null) ?? null,
      fallbackData.hero
    ),
    settings: normalizeSettings(
      (settingsResult.data as Array<{key: string; value: string}> | null) ?? [],
      {
        ctaDescription: fallbackData.settings.cta.description,
        ctaHeadline: fallbackData.settings.cta.headline,
        footerTagline: `${defaultBranding.siteName}. ${defaultBranding.businessLocation}.`,
        stats: fallbackData.settings.stats,
        trustItems: fallbackData.settings.trustItems,
        whyDescription: fallbackData.settings.why.description,
        whyHeadline: fallbackData.settings.why.headline
      }
    )
  };
}

export async function saveHomepageHero(
  actor: AdminStaffIdentity,
  hero: Omit<AdminHomepageHeroRecord, "id"> & {id?: string | null}
) {
  const admin = createSupabaseAdminClient();
  const payload = {
    bg_image_url: hero.bgImageUrl,
    cta_link: hero.ctaLink,
    cta_text: hero.ctaText,
    headline: hero.headline,
    subheadline: hero.subheadline
  };

  const result = hero.id
    ? await admin
        .from("homepage_hero")
        .update(payload)
        .eq("id", hero.id)
        .select("id, headline, subheadline, cta_text, cta_link, bg_image_url")
        .single()
    : await admin
        .from("homepage_hero")
        .insert(payload)
        .select("id, headline, subheadline, cta_text, cta_link, bg_image_url")
        .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: hero.id ? "homepage.hero.updated" : "homepage.hero.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: (result.data as {id: string}).id,
    entityType: "homepage_hero"
  });

  return mapHeroRecord(
    result.data as {
      bg_image_url: string | null;
      cta_link: string;
      cta_text: string;
      headline: string;
      id: string;
      subheadline: string;
    },
    {
      bgImageUrl: null,
      ctaLink: "",
      ctaText: "",
      headline: "",
      subheadline: ""
    }
  );
}

export async function saveHomepageBanner(
  actor: AdminStaffIdentity,
  banner: Omit<AdminHomepageBannerRecord, "id"> & {id?: string}
) {
  const admin = createSupabaseAdminClient();
  const payload = {
    cta_link: banner.ctaLink,
    cta_text: banner.ctaText,
    ends_at: banner.endsAt ? new Date(banner.endsAt).toISOString() : null,
    image_url: banner.imageUrl,
    is_active: banner.isActive,
    sort_order: banner.sortOrder,
    starts_at: banner.startsAt ? new Date(banner.startsAt).toISOString() : null,
    subtitle: banner.subtitle,
    title: banner.title
  };

  const result = banner.id
    ? await admin
        .from("homepage_banners")
        .update(payload)
        .eq("id", banner.id)
        .select(
          "id, title, subtitle, image_url, cta_text, cta_link, sort_order, is_active, starts_at, ends_at"
        )
        .single()
    : await admin
        .from("homepage_banners")
        .insert(payload)
        .select(
          "id, title, subtitle, image_url, cta_text, cta_link, sort_order, is_active, starts_at, ends_at"
        )
        .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: banner.id ? "homepage.banner.updated" : "homepage.banner.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: (result.data as {id: string}).id,
    entityType: "homepage_banner"
  });

  return mapBannerRecord(
    result.data as {
      cta_link: string | null;
      cta_text: string | null;
      ends_at: string | null;
      id: string;
      image_url: string | null;
      is_active: boolean;
      sort_order: number;
      starts_at: string | null;
      subtitle: string | null;
      title: string;
    }
  );
}

export async function saveHomepageDestination(
  actor: AdminStaffIdentity,
  destination: Omit<AdminHomepageDestinationRecord, "id"> & {id?: string}
) {
  const admin = createSupabaseAdminClient();
  const payload = {
    city: destination.city,
    country: destination.country,
    hotels_count: destination.hotelsCount,
    image_url: destination.imageUrl,
    is_active: destination.isActive,
    link: destination.link,
    price_label: destination.priceLabel,
    sort_order: destination.sortOrder
  };

  const result = destination.id
    ? await admin
        .from("homepage_destinations")
        .update(payload)
        .eq("id", destination.id)
        .select(
          "id, city, country, image_url, price_label, hotels_count, link, sort_order, is_active"
        )
        .single()
    : await admin
        .from("homepage_destinations")
        .insert(payload)
        .select(
          "id, city, country, image_url, price_label, hotels_count, link, sort_order, is_active"
        )
        .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: destination.id
      ? "homepage.destination.updated"
      : "homepage.destination.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: (result.data as {id: string}).id,
    entityType: "homepage_destination"
  });

  return mapDestinationRecord(
    result.data as {
      city: string;
      country: string;
      hotels_count: number | null;
      id: string;
      image_url: string | null;
      is_active: boolean;
      link: string | null;
      price_label: string | null;
      sort_order: number;
    }
  );
}

export async function saveHomepageDeal(
  actor: AdminStaffIdentity,
  deal: Omit<AdminHomepageDealRecord, "id"> & {id?: string}
) {
  const admin = createSupabaseAdminClient();
  const payload = {
    airline_name: deal.airlineName,
    currency: deal.currency,
    destination_city: deal.destinationCity,
    destination_code: deal.destinationCode.toUpperCase(),
    expires_at: deal.expiresAt ? new Date(deal.expiresAt).toISOString() : null,
    fare_type: deal.fareType,
    image_url: deal.imageUrl,
    is_active: deal.isActive,
    origin_city: deal.originCity,
    origin_code: deal.originCode.toUpperCase(),
    price: deal.price,
    sort_order: deal.sortOrder
  };

  const result = deal.id
    ? await admin
        .from("homepage_deals")
        .update(payload)
        .eq("id", deal.id)
        .select(
          "id, origin_code, origin_city, destination_code, destination_city, price, currency, airline_name, image_url, fare_type, expires_at, sort_order, is_active"
        )
        .single()
    : await admin
        .from("homepage_deals")
        .insert(payload)
        .select(
          "id, origin_code, origin_city, destination_code, destination_city, price, currency, airline_name, image_url, fare_type, expires_at, sort_order, is_active"
        )
        .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: deal.id ? "homepage.deal.updated" : "homepage.deal.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: (result.data as {id: string}).id,
    entityType: "homepage_deal"
  });

  return mapDealRecord(
    result.data as {
      airline_name: string;
      currency: SupportedCurrency;
      destination_city: string;
      destination_code: string;
      expires_at: string | null;
      fare_type: string | null;
      id: string;
      image_url: string | null;
      is_active: boolean;
      origin_city: string;
      origin_code: string;
      price: number;
      sort_order: number;
    }
  );
}

export async function deleteHomepageRecord({
  actor,
  id,
  section
}: {
  actor: AdminStaffIdentity;
  id: string;
  section: "banners" | "deals" | "destinations";
}) {
  const admin = createSupabaseAdminClient();
  const tableBySection = {
    banners: "homepage_banners",
    deals: "homepage_deals",
    destinations: "homepage_destinations"
  } as const;
  const result = await admin.from(tableBySection[section]).delete().eq("id", id);

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: `homepage.${section}.deleted`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: id,
    entityType: `homepage_${section}`
  });
}

export async function reorderHomepageRecords({
  actor,
  items,
  section
}: {
  actor: AdminStaffIdentity;
  items: Array<{id: string; sortOrder: number}>;
  section: "banners" | "deals" | "destinations";
}) {
  const admin = createSupabaseAdminClient();
  const tableBySection = {
    banners: "homepage_banners",
    deals: "homepage_deals",
    destinations: "homepage_destinations"
  } as const;

  for (const item of items) {
    const updateResult = await admin
      .from(tableBySection[section])
      .update({sort_order: item.sortOrder})
      .eq("id", item.id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  await createAdminAuditLog({
    action: `homepage.${section}.reordered`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: `homepage_${section}`,
    metadata: {
      itemCount: items.length
    }
  });
}

export async function saveHomepageSettings(
  actor: AdminStaffIdentity,
  settings: AdminHomepageSettingsRecord
) {
  const admin = createSupabaseAdminClient();
  const rows = [
    {
      key: "trust_items",
      value: JSON.stringify(normalizeTrustItems(settings.trustItems))
    },
    {
      key: "stats",
      value: JSON.stringify(normalizeStats(settings.stats))
    },
    {
      key: "why_text",
      value: JSON.stringify({
        description: settings.whyDescription,
        headline: settings.whyHeadline
      })
    },
    {
      key: "cta_text",
      value: JSON.stringify({
        description: settings.ctaDescription,
        headline: settings.ctaHeadline
      })
    },
    {
      key: "footer_tagline",
      value: settings.footerTagline
    }
  ];
  const result = await admin
    .from("homepage_settings")
    .upsert(rows, {onConflict: "key"})
    .select("key, value");

  if (result.error) {
    throw new Error(result.error.message);
  }

  await createAdminAuditLog({
    action: "homepage.settings.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "homepage_settings"
  });

  return normalizeSettings(
    (result.data as Array<{key: string; value: string}> | null) ?? [],
    {
      ctaDescription: settings.ctaDescription,
      ctaHeadline: settings.ctaHeadline,
      footerTagline: settings.footerTagline,
      stats: settings.stats,
      trustItems: settings.trustItems,
      whyDescription: settings.whyDescription,
      whyHeadline: settings.whyHeadline
    }
  );
}

export async function uploadHomepageImage({
  actor,
  file
}: {
  actor: AdminStaffIdentity;
  file: File;
}) {
  if (!HOMEPAGE_IMAGE_MIME_TYPES.includes(file.type as (typeof HOMEPAGE_IMAGE_MIME_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > HOMEPAGE_IMAGE_MAX_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }

  await ensureHomepageAssetsBucket();

  const admin = createSupabaseAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const safeFileName = sanitizeFileName(file.name);
  const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() ?? null : null;
  const storagePath = ["homepage", actor.userId, `${Date.now()}-${safeFileName}`].join("/");
  const uploadResult = await admin.storage.from(HOMEPAGE_IMAGE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const publicUrlResult = admin.storage.from(HOMEPAGE_IMAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicUrlResult.data.publicUrl;

  await admin.from("uploads").insert({
    bucket_name: HOMEPAGE_IMAGE_BUCKET,
    byte_size: file.size,
    checksum_sha256: checksumSha256,
    document_category: "other",
    file_extension: extension,
    file_name: file.name,
    is_private: false,
    linked_entity_type: "homepage_asset",
    metadata: asJson({
      uploadedByRole: actor.role
    }),
    mime_type: file.type,
    owner_user_id: actor.userId,
    storage_path: storagePath
  });

  await createAdminAuditLog({
    action: "homepage.asset.uploaded",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "homepage_asset",
    metadata: {
      fileName: file.name,
      storagePath
    }
  });

  return {
    url: publicUrl
  };
}
