import "server-only";

import {
  findVisaCountryOptionByQuery,
  getVisaCountryOption,
  VISA_COUNTRY_OPTIONS,
  VISA_REQUIREMENT_DEFINITIONS,
  VISA_SERVICE_PRODUCTS
} from "@/features/visa/lib/catalog";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney, type SupportedCurrency} from "@/lib/money";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

type VisaProductsRow = {
  content_markdown: string | null;
  country_code: string;
  currency_code: SupportedCurrency;
  id: string;
  metadata: Json;
  price_from_minor: number;
  processing_days_max: number | null;
  processing_days_min: number | null;
  processing_timeline_summary: string | null;
  requirement_summary: string | null;
  requirements: Json;
  service_code: string;
  slug: string;
  sort_order: number;
  summary: string | null;
  supports_dependents: boolean;
  title: string;
};

export type PublicVisaCatalogProduct = {
  countryCode: string;
  countryName: string;
  priceLabel: string;
  priceMinor: number;
  priceCurrency: SupportedCurrency;
  processingTimelineLabel: string;
  requirements: string[];
  serviceCode: string;
  slug: string;
  summary: string;
  supportsDependents: boolean;
  title: string;
};

export type PublicVisaTypeOffer = {
  countryCode: string;
  countryName: string;
  key: string;
  priceLabel: string;
  priceMinor: number;
  priceCurrency: SupportedCurrency;
  processingTimelineLabel: string;
  requirements: string[];
  slug: string;
  summary: string;
  title: string;
  validityLabel: string;
};

type GeneratedVisaTypeKey = "business" | "student" | "tourist";

const visaTypeOrder: GeneratedVisaTypeKey[] = ["tourist", "business", "student"];

function prettifyRequirement(code: string) {
  return code
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveRequirementList(value: Json) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (
        typeof item === "object" &&
        item !== null &&
        "label" in item &&
        typeof item.label === "string"
      ) {
        return item.label;
      }

      if (
        typeof item === "object" &&
        item !== null &&
        "code" in item &&
        typeof item.code === "string"
      ) {
        return item.code;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item))
    .map((item) => {
      const definition =
        item in VISA_REQUIREMENT_DEFINITIONS
          ? VISA_REQUIREMENT_DEFINITIONS[item as keyof typeof VISA_REQUIREMENT_DEFINITIONS]
          : null;

      return definition ? prettifyRequirement(definition.code) : prettifyRequirement(item);
    });
}

function asRecord(value: Json) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null;
}

function asString(value: Json | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asInteger(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function normalizeVisaTypeKey(value: string | null | undefined): string {
  if (!value) {
    return "tourist";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("student")) {
    return "student";
  }

  if (normalized.includes("business")) {
    return "business";
  }

  if (normalized.includes("tour") || normalized.includes("visitor")) {
    return "tourist";
  }

  return normalized;
}

function inferVisaTypeKeyFromText(...values: Array<string | null | undefined>) {
  return normalizeVisaTypeKey(values.find((value) => typeof value === "string" && value.length > 0));
}

function getDefaultValidityLabel(typeKey: string) {
  if (typeKey === "business") {
    return "Short-term business visits, subject to embassy approval.";
  }

  if (typeKey === "student") {
    return "Study entry window and stay length depend on school and consular approval.";
  }

  return "Short-stay travel validity depends on the issuing authority.";
}

function getDefaultRequirementsForType(typeKey: string, baseRequirements: string[]) {
  if (typeKey === "business") {
    return [...baseRequirements, "Business invitation letter", "Employer introduction letter"];
  }

  if (typeKey === "student") {
    return [...baseRequirements, "School admission letter", "Tuition or sponsorship evidence"];
  }

  return baseRequirements;
}

function getAdjustedMinorAmount(baseAmountMinor: number, typeKey: string) {
  if (typeKey === "business") {
    return Math.round(baseAmountMinor * 1.12);
  }

  if (typeKey === "student") {
    return Math.round(baseAmountMinor * 1.18);
  }

  return baseAmountMinor;
}

function getAdjustedTimeline(baseTimeline: string, typeKey: string) {
  if (typeKey === "business") {
    return baseTimeline.includes("working days")
      ? `${baseTimeline} with employer and invitation review`
      : "Priority business processing window shared after review";
  }

  if (typeKey === "student") {
    return baseTimeline.includes("working days")
      ? `${baseTimeline} plus admission and funding verification`
      : "Student processing timeline shared after academic review";
  }

  return baseTimeline;
}

function getDefaultTitle(countryName: string, typeKey: string) {
  if (typeKey === "business") {
    return `${countryName} Business Visa Support`;
  }

  if (typeKey === "student") {
    return `${countryName} Student Visa Support`;
  }

  return `${countryName} Tourist Visa Support`;
}

function getDefaultSummary(countryName: string, typeKey: string) {
  if (typeKey === "business") {
    return `Structured ${countryName} business-travel visa support with document checks, invitation review, and concierge-style preparation for time-sensitive trips.`;
  }

  if (typeKey === "student") {
    return `Guided ${countryName} student visa support with school-document preparation, funding review, and a calmer application handoff for academic travel.`;
  }

  return `Our team helps prepare your ${countryName} tourist visa file with practical document guidance, travel-readiness checks, and premium support throughout the application journey.`;
}

function sortVisaTypeOffers(offers: PublicVisaTypeOffer[]) {
  return [...offers].sort((left, right) => {
    const leftIndex = visaTypeOrder.indexOf(left.key as GeneratedVisaTypeKey);
    const rightIndex = visaTypeOrder.indexOf(right.key as GeneratedVisaTypeKey);
    const normalizedLeftIndex = leftIndex >= 0 ? leftIndex : visaTypeOrder.length;
    const normalizedRightIndex = rightIndex >= 0 ? rightIndex : visaTypeOrder.length;

    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildFallbackCatalog(locale: Locale) {
  return VISA_SERVICE_PRODUCTS.map((product) => {
    const country = getVisaCountryOption(product.countryCode);
    const countryName = country?.name ?? product.countryCode;
    const requirements = product.requirementCodes.map((code) => prettifyRequirement(code));
    const appointmentNote = product.processingTimeline.appointmentRequired
      ? "Appointment support included."
      : "Digital-first application guidance.";

    return {
      countryCode: product.countryCode,
      countryName,
      priceLabel: formatMoney(product.price, locale),
      priceMinor: product.price.amountMinor,
      priceCurrency: product.price.currency,
      processingTimelineLabel: `${product.processingTimeline.processingDaysMin}-${product.processingTimeline.processingDaysMax} working days`,
      requirements,
      serviceCode: product.serviceCode,
      slug: product.slug,
      summary: `${countryName} visa preparation with document checks, travel-readiness review, and concierge-style submission support. ${appointmentNote}`,
      supportsDependents: product.supportsDependents,
      title: `${countryName} Visa Support`
    } satisfies PublicVisaCatalogProduct;
  });
}

function buildFallbackVisaTypeOffers(
  baseProduct: PublicVisaCatalogProduct,
  locale: Locale
) {
  return sortVisaTypeOffers(
    visaTypeOrder.map((typeKey) => {
      const priceMinor = getAdjustedMinorAmount(baseProduct.priceMinor, typeKey);

      return {
        countryCode: baseProduct.countryCode,
        countryName: baseProduct.countryName,
        key: typeKey,
        priceLabel: formatMoney(
          {
            amountMinor: priceMinor,
            currency: baseProduct.priceCurrency
          },
          locale
        ),
        priceMinor,
        priceCurrency: baseProduct.priceCurrency,
        processingTimelineLabel: getAdjustedTimeline(
          baseProduct.processingTimelineLabel,
          typeKey
        ),
        requirements: getDefaultRequirementsForType(typeKey, baseProduct.requirements),
        slug: `${baseProduct.slug}-${typeKey}`,
        summary: getDefaultSummary(baseProduct.countryName, typeKey),
        title: getDefaultTitle(baseProduct.countryName, typeKey),
        validityLabel: getDefaultValidityLabel(typeKey)
      } satisfies PublicVisaTypeOffer;
    })
  );
}

export async function listPublicVisaCatalog(locale: Locale) {
  const admin = createSupabaseAdminClient();
  const localeCode = locale === "de" ? "de" : "en";
  const primaryResult = await admin
    .from("visa_products")
    .select(
      "id, country_code, service_code, slug, title, summary, requirement_summary, processing_timeline_summary, price_from_minor, currency_code, supports_dependents, processing_days_min, processing_days_max, requirements, metadata, content_markdown, sort_order"
    )
    .eq("locale", localeCode)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("sort_order", {ascending: true})
    .order("created_at", {ascending: false});
  const primaryRows = (primaryResult.data as VisaProductsRow[] | null) ?? [];

  if (primaryRows.length === 0 && localeCode !== "en") {
    const fallbackResult = await admin
      .from("visa_products")
      .select(
        "id, country_code, service_code, slug, title, summary, requirement_summary, processing_timeline_summary, price_from_minor, currency_code, supports_dependents, processing_days_min, processing_days_max, requirements, metadata, content_markdown, sort_order"
      )
      .eq("locale", "en")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("sort_order", {ascending: true})
      .order("created_at", {ascending: false});
    const fallbackRows = (fallbackResult.data as VisaProductsRow[] | null) ?? [];

    if (fallbackRows.length > 0) {
      return fallbackRows.map((row) => {
        const country = getVisaCountryOption(row.country_code);

        return {
          countryCode: row.country_code,
          countryName: country?.name ?? row.country_code,
          priceLabel: formatMoney(
            {
              amountMinor: row.price_from_minor,
              currency: row.currency_code
            },
            locale
          ),
          priceMinor: row.price_from_minor,
          priceCurrency: row.currency_code,
          processingTimelineLabel:
            row.processing_timeline_summary?.trim() ||
            (row.processing_days_min && row.processing_days_max
              ? `${row.processing_days_min}-${row.processing_days_max} working days`
              : "Processing timeline shared after review"),
          requirements:
            resolveRequirementList(row.requirements).length > 0
              ? resolveRequirementList(row.requirements)
              : row.requirement_summary
                ? [row.requirement_summary]
                : ["Document checklist shared after destination selection"],
          serviceCode: row.service_code,
          slug: row.slug,
          summary:
            row.summary?.trim() ||
            `Structured visa assistance for ${country?.name ?? row.country_code}.`,
          supportsDependents: row.supports_dependents,
          title: row.title
        } satisfies PublicVisaCatalogProduct;
      });
    }
  }

  if (primaryRows.length === 0) {
    return buildFallbackCatalog(locale);
  }

  return primaryRows.map((row) => {
    const country = getVisaCountryOption(row.country_code);

    return {
      countryCode: row.country_code,
      countryName: country?.name ?? row.country_code,
      priceLabel: formatMoney(
        {
          amountMinor: row.price_from_minor,
          currency: row.currency_code
        },
        locale
      ),
      priceMinor: row.price_from_minor,
      priceCurrency: row.currency_code,
      processingTimelineLabel:
        row.processing_timeline_summary?.trim() ||
        (row.processing_days_min && row.processing_days_max
          ? `${row.processing_days_min}-${row.processing_days_max} working days`
          : "Processing timeline shared after review"),
      requirements:
        resolveRequirementList(row.requirements).length > 0
          ? resolveRequirementList(row.requirements)
          : row.requirement_summary
            ? [row.requirement_summary]
            : ["Document checklist shared after destination selection"],
      serviceCode: row.service_code,
      slug: row.slug,
      summary:
        row.summary?.trim() ||
        `Structured visa assistance for ${country?.name ?? row.country_code}.`,
      supportsDependents: row.supports_dependents,
      title: row.title
    } satisfies PublicVisaCatalogProduct;
  });
}

export function listPopularVisaCountries() {
  return VISA_COUNTRY_OPTIONS.filter((country) =>
    VISA_SERVICE_PRODUCTS.some((product) => product.countryCode === country.code)
  );
}

function buildExplicitVisaTypeOffer(
  row: PublicVisaCatalogProduct,
  locale: Locale
) {
  const typeKey = inferVisaTypeKeyFromText(row.title, row.serviceCode, row.slug);

  return {
    countryCode: row.countryCode,
    countryName: row.countryName,
    key: typeKey,
    priceLabel: row.priceLabel,
    priceMinor: row.priceMinor,
    priceCurrency: row.priceCurrency,
    processingTimelineLabel: row.processingTimelineLabel,
    requirements: row.requirements,
    slug: row.slug,
    summary: row.summary,
    title:
      typeKey === "tourist" || typeKey === "business" || typeKey === "student"
        ? getDefaultTitle(row.countryName, typeKey)
        : row.title,
    validityLabel: getDefaultValidityLabel(typeKey)
  } satisfies PublicVisaTypeOffer;
}

function buildMetadataVisaTypeOffers(
  row: PublicVisaCatalogProduct,
  metadata: Json,
  locale: Locale
) {
  const metadataRecord = asRecord(metadata);
  const rawVisaTypes =
    metadataRecord?.visaTypes ??
    metadataRecord?.visa_types ??
    null;

  if (!Array.isArray(rawVisaTypes)) {
    return [] as PublicVisaTypeOffer[];
  }

  return rawVisaTypes
    .map((entry) => {
      const visaTypeRecord = asRecord(entry);

      if (!visaTypeRecord) {
        return null;
      }

      const typeKey = inferVisaTypeKeyFromText(
        asString(visaTypeRecord.type),
        asString(visaTypeRecord.key),
        asString(visaTypeRecord.slug),
        asString(visaTypeRecord.title)
      );
      const priceMinor =
        asInteger(visaTypeRecord.priceFromMinor) ??
        asInteger(visaTypeRecord.price_from_minor) ??
        getAdjustedMinorAmount(row.priceMinor, typeKey);
      const priceCurrency =
        asString(visaTypeRecord.currency) ??
        asString(visaTypeRecord.currency_code) ??
        row.priceCurrency;
      const validityLabel =
        asString(visaTypeRecord.validity) ??
        asString(visaTypeRecord.validityLabel) ??
        asString(visaTypeRecord.validity_label) ??
        getDefaultValidityLabel(typeKey);
      const requirements =
        resolveRequirementList(visaTypeRecord.requirements ?? []).length > 0
          ? resolveRequirementList(visaTypeRecord.requirements ?? [])
          : getDefaultRequirementsForType(typeKey, row.requirements);

      return {
        countryCode: row.countryCode,
        countryName: row.countryName,
        key: typeKey,
        priceLabel: formatMoney(
          {
            amountMinor: priceMinor,
            currency: priceCurrency as SupportedCurrency
          },
          locale
        ),
        priceMinor,
        priceCurrency: priceCurrency as SupportedCurrency,
        processingTimelineLabel:
          asString(visaTypeRecord.processingTimeline) ??
          asString(visaTypeRecord.processing_timeline) ??
          row.processingTimelineLabel,
        requirements,
        slug:
          asString(visaTypeRecord.slug) ??
          `${row.slug}-${typeKey}`,
        summary:
          asString(visaTypeRecord.summary) ??
          getDefaultSummary(row.countryName, typeKey),
        title:
          asString(visaTypeRecord.title) ??
          getDefaultTitle(row.countryName, typeKey),
        validityLabel
      } satisfies PublicVisaTypeOffer;
    })
    .filter((offer): offer is PublicVisaTypeOffer => Boolean(offer));
}

export async function getPublicVisaCountryCatalog(
  locale: Locale,
  countryQuery: string
) {
  const country = findVisaCountryOptionByQuery(countryQuery);

  if (!country) {
    return null;
  }

  const catalog = await listPublicVisaCatalog(locale);
  const countryProducts = catalog.filter((product) => product.countryCode === country.code);

  if (countryProducts.length === 0) {
    return {
      country,
      products: [] as PublicVisaTypeOffer[]
    };
  }

  const admin = createSupabaseAdminClient();
  const visaProductsResult = await admin
    .from("visa_products")
    .select("slug, metadata")
    .eq("country_code", country.code)
    .eq("locale", locale === "de" ? "de" : "en")
    .eq("is_published", true)
    .is("deleted_at", null);
  const metadataBySlug = new Map(
    (((visaProductsResult.data as Array<{metadata: Json; slug: string}> | null) ?? []).map(
      (row) => [row.slug, row.metadata] as const
    ))
  );

  const explicitOffers = countryProducts.flatMap((product) => {
    const metadataOffers = buildMetadataVisaTypeOffers(
      product,
      metadataBySlug.get(product.slug) ?? null,
      locale
    );

    if (metadataOffers.length > 0) {
      return metadataOffers;
    }

    return [buildExplicitVisaTypeOffer(product, locale)];
  });
  const offersByKey = new Map<string, PublicVisaTypeOffer>();

  for (const offer of explicitOffers) {
    offersByKey.set(offer.key, offer);
  }

  const fallbackOffers = buildFallbackVisaTypeOffers(countryProducts[0], locale);

  for (const fallbackOffer of fallbackOffers) {
    if (!offersByKey.has(fallbackOffer.key)) {
      offersByKey.set(fallbackOffer.key, fallbackOffer);
    }
  }

  return {
    country,
    products: sortVisaTypeOffers([...offersByKey.values()])
  };
}
