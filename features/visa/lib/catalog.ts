import {type Money} from "@/lib/money";

import {
  type VisaCountryOption,
  type VisaDocumentType,
  type VisaRequirementDefinition,
  type VisaServiceProduct
} from "../types";

const TEN_MEGABYTES = 10 * 1024 * 1024;

function eur(amountMinor: number): Money {
  return {
    amountMinor,
    currency: "EUR"
  };
}

export const VISA_COUNTRY_OPTIONS: VisaCountryOption[] = [
  {
    aliases: ["at", "aut", "austria", "osterreich", "oesterreich", "vienna"],
    code: "AT",
    localizedName: "Oesterreich",
    name: "Austria",
    slug: "at"
  },
  {
    aliases: ["ae", "are", "uae", "dubai", "united arab emirates"],
    code: "AE",
    localizedName: "Vereinigte Arabische Emirate",
    name: "United Arab Emirates",
    slug: "ae"
  },
  {
    aliases: ["gb", "gbr", "uk", "united kingdom", "britain", "london"],
    code: "GB",
    localizedName: "Vereinigtes Koenigreich",
    name: "United Kingdom",
    slug: "gb"
  },
  {
    aliases: ["ng", "nga", "nigeria", "lagos"],
    code: "NG",
    localizedName: "Nigeria",
    name: "Nigeria",
    slug: "ng"
  },
  {
    aliases: ["us", "usa", "united states", "america", "new york"],
    code: "US",
    localizedName: "Vereinigte Staaten",
    name: "United States",
    slug: "us"
  }
];

export const VISA_REQUIREMENT_DEFINITIONS: Record<
  VisaDocumentType,
  VisaRequirementDefinition
> = {
  accommodation_proof: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "accommodation_proof",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: true,
    required: true
  },
  dependent_consent: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "dependent_consent",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: true,
    required: false
  },
  employment_letter: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "employment_letter",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: false,
    required: false
  },
  financial_proof: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "financial_proof",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: true,
    required: true
  },
  invitation_letter: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "invitation_letter",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: false,
    required: false
  },
  passport_scan: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "passport_scan",
    documentCategory: "passport_scan",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: false,
    required: true
  },
  photograph: {
    acceptedMimeTypes: ["image/jpeg", "image/png"],
    code: "photograph",
    documentCategory: "visa_document",
    maxSizeBytes: 5 * 1024 * 1024,
    multiple: false,
    required: true
  },
  residency_permit: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "residency_permit",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: false,
    required: false
  },
  travel_insurance: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "travel_insurance",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: false,
    required: true
  },
  travel_itinerary: {
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    code: "travel_itinerary",
    documentCategory: "visa_document",
    maxSizeBytes: TEN_MEGABYTES,
    multiple: true,
    required: true
  }
};

export const VISA_SERVICE_PRODUCTS: VisaServiceProduct[] = [
  {
    countryCode: "AT",
    optionalRequirementCodes: ["employment_letter", "residency_permit", "invitation_letter"],
    price: eur(18900),
    processingTimeline: {
      appointmentRequired: true,
      prioritySupport: true,
      processingDaysMax: 20,
      processingDaysMin: 10
    },
    requirementCodes: [
      "passport_scan",
      "photograph",
      "travel_itinerary",
      "accommodation_proof",
      "financial_proof",
      "travel_insurance"
    ],
    serviceCode: "at-schengen-visitor-support",
    slug: "at",
    supportsDependents: true
  },
  {
    countryCode: "AE",
    optionalRequirementCodes: ["employment_letter", "invitation_letter"],
    price: eur(14900),
    processingTimeline: {
      appointmentRequired: false,
      prioritySupport: true,
      processingDaysMax: 10,
      processingDaysMin: 5
    },
    requirementCodes: [
      "passport_scan",
      "photograph",
      "travel_itinerary",
      "accommodation_proof"
    ],
    serviceCode: "ae-short-stay-support",
    slug: "ae",
    supportsDependents: true
  },
  {
    countryCode: "GB",
    optionalRequirementCodes: ["employment_letter", "residency_permit", "dependent_consent"],
    price: eur(21500),
    processingTimeline: {
      appointmentRequired: true,
      prioritySupport: true,
      processingDaysMax: 30,
      processingDaysMin: 15
    },
    requirementCodes: [
      "passport_scan",
      "photograph",
      "travel_itinerary",
      "accommodation_proof",
      "financial_proof"
    ],
    serviceCode: "gb-standard-visitor-support",
    slug: "gb",
    supportsDependents: true
  }
];

export function findVisaCountryOptionByQuery(query: string | undefined) {
  if (!query) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();

  return (
    VISA_COUNTRY_OPTIONS.find((option) => option.code.toLowerCase() === normalizedQuery) ??
    VISA_COUNTRY_OPTIONS.find((option) => option.slug === normalizedQuery) ??
    VISA_COUNTRY_OPTIONS.find((option) =>
      option.aliases.some((alias) => normalizedQuery.includes(alias))
    ) ??
    null
  );
}

export function getVisaCountryOption(code: string | undefined) {
  if (!code) {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();

  return VISA_COUNTRY_OPTIONS.find((option) => option.code === normalizedCode) ?? null;
}

export function getVisaServiceProduct(code: string | undefined) {
  if (!code) {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();

  return VISA_SERVICE_PRODUCTS.find((product) => product.countryCode === normalizedCode) ?? null;
}

export function getVisaServiceProductBySlug(slug: string | undefined) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();

  return VISA_SERVICE_PRODUCTS.find((product) => product.slug === normalizedSlug) ?? null;
}
