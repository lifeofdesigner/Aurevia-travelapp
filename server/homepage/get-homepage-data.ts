import "server-only";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";
import {type AppRoute, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getSiteBranding, type SiteBranding} from "@/server/brand/site-branding";

type HomepageHero = {
  bgImageUrl: string | null;
  ctaLink: string;
  ctaText: string;
  headline: string;
  subheadline: string;
};

type HomepageBanner = {
  ctaLink: string | null;
  ctaText: string | null;
  imageUrl: string | null;
  subtitle: string | null;
  title: string;
};

type HomepageDestination = {
  city: string;
  country: string;
  hotelsCount: number | null;
  imageUrl: string;
  link: string | null;
  priceLabel: string | null;
};

type HomepageDeal = {
  airlineName: string;
  currency: SupportedCurrency;
  destinationCity: string;
  destinationCode: string;
  expiresAt: string | null;
  fareType: string | null;
  imageUrl: string | null;
  originCity: string;
  originCode: string;
  price: number;
};

type HomepageService = {
  description: string;
  route: AppRoute;
  title: string;
};

type HomepageStat = {
  label: string;
  value: string;
};

type HomepageSectionCopy = {
  bannersEyebrow: string;
  bannersTitle: string;
  ctaButtonLabel: string;
  destinationsEyebrow: string;
  destinationsTitle: string;
  heroBadge: string;
  sectionServicesTitle: string;
  sectionServicesSummary: string;
  whyEyebrow: string;
};

type HomepageSettings = {
  cta: {
    description: string;
    headline: string;
  };
  footerTagline: string;
  stats: HomepageStat[];
  trustItems: string[];
  why: {
    description: string;
    headline: string;
  };
};

export type HomepageData = {
  banners: HomepageBanner[];
  copy: HomepageSectionCopy;
  deals: HomepageDeal[];
  destinations: HomepageDestination[];
  hero: HomepageHero;
  services: HomepageService[];
  settings: HomepageSettings;
};

const homeImages = {
  accra: "/images/home/accra.svg",
  dubai: "/images/home/dubai.svg",
  hero: "/images/home/hero.svg",
  london: "/images/home/london.svg",
  visa: "/images/home/visa.svg"
} as const;

const fallbackHero: HomepageHero = {
  bgImageUrl: homeImages.hero,
  ctaLink: "#search-planner",
  ctaText: "Start Planning",
  headline: "Premium journeys, coordinated with European care",
  subheadline:
    "Aurevia Travel designs polished international itineraries with calm execution, trusted supplier coordination, and concierge support from first quote to final arrival."
};

const fallbackBanners: HomepageBanner[] = [
  {
    ctaLink: "/en/flights",
    ctaText: "View Offer",
    imageUrl: homeImages.london,
    subtitle: "Smart long-haul options for business and leisure travelers out of Lagos.",
    title: "London summer departures from EUR 320"
  },
  {
    ctaLink: "/en/hotels",
    ctaText: "See Stays",
    imageUrl: homeImages.dubai,
    subtitle: "Premium stopovers, executive stays, and carefully timed connections.",
    title: "Dubai stopovers with curated hotel access"
  },
  {
    ctaLink: "/en/visa",
    ctaText: "Start Visa Support",
    imageUrl: homeImages.visa,
    subtitle: "Structured visa preparation for purposeful international travel.",
    title: "Document-ready visa assistance for key routes"
  }
];

const fallbackDestinations: HomepageDestination[] = [
  {
    city: "London",
    country: "United Kingdom",
    hotelsCount: 185,
    imageUrl: homeImages.london,
    link: "/en/hotels",
    priceLabel: "From EUR 320"
  },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    hotelsCount: 142,
    imageUrl: homeImages.dubai,
    link: "/en/hotels",
    priceLabel: "From EUR 410"
  },
  {
    city: "Doha",
    country: "Qatar",
    hotelsCount: 74,
    imageUrl: homeImages.visa,
    link: "/en/hotels",
    priceLabel: "From EUR 290"
  },
  {
    city: "Accra",
    country: "Ghana",
    hotelsCount: 93,
    imageUrl: homeImages.accra,
    link: "/en/hotels",
    priceLabel: "From EUR 215"
  }
];

const fallbackDeals: HomepageDeal[] = [
  {
    airlineName: "British Airways",
    currency: "NGN",
    destinationCity: "London",
    destinationCode: "LHR",
    expiresAt: null,
    fareType: "Economy",
    imageUrl: homeImages.london,
    originCity: "Lagos",
    originCode: "LOS",
    price: 1422982
  },
  {
    airlineName: "Emirates",
    currency: "NGN",
    destinationCity: "Dubai",
    destinationCode: "DXB",
    expiresAt: null,
    fareType: "Economy",
    imageUrl: homeImages.dubai,
    originCity: "Lagos",
    originCode: "LOS",
    price: 890500
  },
  {
    airlineName: "Qatar Airways",
    currency: "NGN",
    destinationCity: "Doha",
    destinationCode: "DOH",
    expiresAt: null,
    fareType: "Economy",
    imageUrl: homeImages.visa,
    originCity: "Lagos",
    originCode: "LOS",
    price: 541152
  }
];

const fallbackServices: HomepageService[] = [
  {
    description: "Premium air itineraries with flexible routing and fare intelligence.",
    route: ROUTES.flights,
    title: "Flights"
  },
  {
    description: "Trusted stays selected for location, pace, and arrival experience.",
    route: ROUTES.hotels,
    title: "Hotels"
  },
  {
    description: "Executive vehicle options for city movement and intercity comfort.",
    route: ROUTES.cars,
    title: "Car hire"
  },
  {
    description: "Airport and hotel transfers timed to match your full itinerary.",
    route: ROUTES.transfers,
    title: "Transfers"
  },
  {
    description: "Curated excursions that fit business, leisure, or blended schedules.",
    route: ROUTES.tours,
    title: "Tours"
  },
  {
    description: "Structured visa guidance with privacy-first document handling.",
    route: ROUTES.visa,
    title: "Visa assistance"
  }
];

const fallbackCopy: HomepageSectionCopy = {
  bannersEyebrow: "Promotions",
  bannersTitle: "Current travel offers and editorial highlights",
  ctaButtonLabel: "Speak to a Concierge",
  destinationsEyebrow: "Featured Destinations",
  destinationsTitle: "Signature places for smart international itineraries",
  heroBadge: "Vienna-based concierge",
  sectionServicesSummary: "Six core services arranged into one premium customer journey.",
  sectionServicesTitle: "Travel better with coordinated services across every booking stage",
  whyEyebrow: "Why Aurevia"
};

const fallbackSettings: HomepageSettings = {
  cta: {
    description:
      "Speak with Aurevia Travel for concierge-style planning across flights, hotels, visas, and ground movement.",
    headline: "Travel better. Worry less."
  },
  footerTagline:
    "Premium travel planning, booking coordination, and document support from Vienna for globally mobile clients.",
  stats: [
    {label: "Supported currencies", value: "5"},
    {label: "Avg discount", value: "20%"},
    {label: "Privacy compliant", value: "GDPR"}
  ],
  trustItems: [
    "IATA Accredited",
    "Secure Payments",
    "24/7 Concierge",
    "Best Price Guarantee",
    "Multi-currency"
  ],
  why: {
    description:
      "We align timing, suppliers, traveler details, and commercial clarity so your trip feels settled before departure and dependable after landing.",
    headline: "Built to feel calm, precise, and internationally credible"
  }
};

function hasSupabasePublicConfig() {
  const env = getPublicEnv();

  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

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

function resolveHomepageImageUrl(value: string | null | undefined, fallback: string | null) {
  if (!value) {
    return fallback;
  }

  if (value.includes("photo-1513635269975")) {
    return homeImages.london;
  }

  if (value.includes("photo-1512453979798")) {
    return homeImages.dubai;
  }

  if (value.includes("photo-1577315734214")) {
    return homeImages.visa;
  }

  if (value.includes("photo-1589118949245")) {
    return homeImages.accra;
  }

  if (value.includes("photo-1516557070061")) {
    return homeImages.hero;
  }

  return value;
}

function normalizeHero(
  hero:
    | {
        bg_image_url: string | null;
        cta_link: string;
        cta_text: string;
        headline: string;
        subheadline: string;
      }
    | null
    | undefined
) {
  if (!hero) {
    return fallbackHero;
  }

  return {
    bgImageUrl: resolveHomepageImageUrl(hero.bg_image_url, fallbackHero.bgImageUrl),
    ctaLink: hero.cta_link || fallbackHero.ctaLink,
    ctaText: hero.cta_text || fallbackHero.ctaText,
    headline: hero.headline || fallbackHero.headline,
    subheadline: hero.subheadline || fallbackHero.subheadline
  };
}

function normalizeBanners(
  banners:
    | Array<{
        cta_link: string | null;
        cta_text: string | null;
        image_url: string | null;
        subtitle: string | null;
        title: string;
      }>
    | null
    | undefined
) {
  const mapped =
    banners?.filter((banner) => typeof banner.title === "string" && banner.title.trim().length > 0).map((banner) => ({
      ctaLink: banner.cta_link,
      ctaText: banner.cta_text,
      imageUrl: resolveHomepageImageUrl(banner.image_url, null),
      subtitle: banner.subtitle,
      title: banner.title
    })) ?? [];

  return mapped.length > 0 ? mapped : fallbackBanners;
}

function normalizeDestinations(
  destinations:
    | Array<{
        city: string;
        country: string;
        hotels_count: number | null;
        image_url: string | null;
        link: string | null;
        price_label: string | null;
      }>
    | null
    | undefined
) {
  const mapped =
    destinations
      ?.filter(
        (destination) =>
          typeof destination.city === "string" &&
          destination.city.trim().length > 0 &&
          typeof destination.country === "string" &&
          destination.country.trim().length > 0
      )
      .map((destination, index) => ({
        city: destination.city,
        country: destination.country,
        hotelsCount: destination.hotels_count,
        imageUrl:
          resolveHomepageImageUrl(
            destination.image_url,
            fallbackDestinations[index % fallbackDestinations.length]?.imageUrl ?? fallbackDestinations[0].imageUrl
          ) ?? fallbackDestinations[0].imageUrl,
        link: destination.link,
        priceLabel: destination.price_label
      })) ?? [];

  return mapped.length > 0 ? mapped : fallbackDestinations;
}

function normalizeDeals(
  deals:
    | Array<{
        airline_name: string;
        currency: SupportedCurrency;
        destination_city: string;
        destination_code: string;
        expires_at: string | null;
        fare_type: string | null;
        image_url: string | null;
        origin_city: string;
        origin_code: string;
        price: number;
      }>
    | null
    | undefined
) {
  const mapped =
    deals
      ?.filter(
        (deal) =>
          typeof deal.origin_code === "string" &&
          typeof deal.destination_code === "string" &&
          typeof deal.price === "number"
      )
      .map((deal, index) => ({
        airlineName: deal.airline_name,
        currency: deal.currency,
        destinationCity: deal.destination_city,
        destinationCode: deal.destination_code,
        expiresAt: deal.expires_at,
        fareType: deal.fare_type,
        imageUrl: resolveHomepageImageUrl(
          deal.image_url,
          fallbackDeals[index % fallbackDeals.length]?.imageUrl ?? fallbackDeals[0].imageUrl
        ),
        originCity: deal.origin_city,
        originCode: deal.origin_code,
        price: deal.price
      })) ?? [];

  return mapped.length > 0 ? mapped : fallbackDeals;
}

function normalizeSettings(
  settings:
    | Array<{
        key: string;
        value: string;
      }>
    | null
    | undefined
) {
  const settingsMap = new Map(settings?.map((setting) => [setting.key, setting.value]) ?? []);

  return {
    copy: {
      ...fallbackCopy,
      ...parseJsonText<Partial<HomepageSectionCopy>>(settingsMap.get("section_copy"), {})
    },
    settings: {
      cta: {
        ...fallbackSettings.cta,
        ...parseJsonText<Partial<HomepageSettings["cta"]>>(
          settingsMap.get("cta_text"),
          fallbackSettings.cta
        )
      },
      footerTagline: settingsMap.get("footer_tagline") ?? fallbackSettings.footerTagline,
      stats: parseJsonText<HomepageStat[]>(settingsMap.get("stats"), fallbackSettings.stats),
      trustItems: parseJsonText<string[]>(
        settingsMap.get("trust_items"),
        fallbackSettings.trustItems
      ),
      why: {
        ...fallbackSettings.why,
        ...parseJsonText<Partial<HomepageSettings["why"]>>(
          settingsMap.get("why_text"),
          fallbackSettings.why
        )
      }
    }
  };
}

function rewriteBrandTokens(value: string, branding: SiteBranding) {
  const firstBrandWord = branding.siteName.trim().split(/\s+/)[0] || branding.siteName;

  return value
    .replaceAll("Aurevia Travel", branding.siteName)
    .replace(/\bAurevia\b/g, firstBrandWord)
    .replaceAll("Vienna, Austria", branding.businessLocation)
    .replaceAll("Vienna-based", `${branding.businessCity}-based`)
    .replaceAll("from Vienna", `from ${branding.businessCity}`);
}

function brandHero(hero: HomepageHero, branding: SiteBranding): HomepageHero {
  return {
    ...hero,
    ctaText: rewriteBrandTokens(hero.ctaText, branding),
    headline: rewriteBrandTokens(hero.headline, branding),
    subheadline: rewriteBrandTokens(hero.subheadline, branding)
  };
}

function brandBanners(banners: HomepageBanner[], branding: SiteBranding) {
  return banners.map((banner) => ({
    ...banner,
    ctaText: banner.ctaText ? rewriteBrandTokens(banner.ctaText, branding) : banner.ctaText,
    subtitle: banner.subtitle ? rewriteBrandTokens(banner.subtitle, branding) : banner.subtitle,
    title: rewriteBrandTokens(banner.title, branding)
  }));
}

function brandCopy(copy: HomepageSectionCopy, branding: SiteBranding): HomepageSectionCopy {
  return {
    bannersEyebrow: rewriteBrandTokens(copy.bannersEyebrow, branding),
    bannersTitle: rewriteBrandTokens(copy.bannersTitle, branding),
    ctaButtonLabel: rewriteBrandTokens(copy.ctaButtonLabel, branding),
    destinationsEyebrow: rewriteBrandTokens(copy.destinationsEyebrow, branding),
    destinationsTitle: rewriteBrandTokens(copy.destinationsTitle, branding),
    heroBadge: rewriteBrandTokens(copy.heroBadge, branding),
    sectionServicesSummary: rewriteBrandTokens(copy.sectionServicesSummary, branding),
    sectionServicesTitle: rewriteBrandTokens(copy.sectionServicesTitle, branding),
    whyEyebrow: rewriteBrandTokens(copy.whyEyebrow, branding)
  };
}

function brandSettings(settings: HomepageSettings, branding: SiteBranding): HomepageSettings {
  return {
    cta: {
      description: rewriteBrandTokens(settings.cta.description, branding),
      headline: rewriteBrandTokens(settings.cta.headline, branding)
    },
    footerTagline: rewriteBrandTokens(settings.footerTagline, branding),
    stats: settings.stats,
    trustItems: settings.trustItems.map((item) => rewriteBrandTokens(item, branding)),
    why: {
      description: rewriteBrandTokens(settings.why.description, branding),
      headline: rewriteBrandTokens(settings.why.headline, branding)
    }
  };
}

function brandHomepageData(data: HomepageData, branding: SiteBranding): HomepageData {
  return {
    ...data,
    banners: brandBanners(data.banners, branding),
    copy: brandCopy(data.copy, branding),
    hero: brandHero(data.hero, branding),
    settings: brandSettings(data.settings, branding)
  };
}

export async function getHomepageData(_locale: Locale): Promise<HomepageData> {
  const branding = await getSiteBranding();

  if (!hasSupabasePublicConfig()) {
    return brandHomepageData({
      banners: fallbackBanners,
      copy: fallbackCopy,
      deals: fallbackDeals,
      destinations: fallbackDestinations,
      hero: fallbackHero,
      services: fallbackServices,
      settings: fallbackSettings
    }, branding);
  }

  try {
    const supabase = createSupabaseServerClient();
    const [heroResult, bannersResult, destinationsResult, dealsResult, settingsResult] =
      await Promise.all([
        supabase
          .from("homepage_hero")
          .select("headline, subheadline, cta_text, cta_link, bg_image_url")
          .order("updated_at", {ascending: false})
          .limit(1)
          .maybeSingle(),
        supabase
          .from("homepage_banners")
          .select("title, subtitle, image_url, cta_text, cta_link")
          .order("sort_order", {ascending: true}),
        supabase
          .from("homepage_destinations")
          .select("city, country, image_url, price_label, hotels_count, link")
          .order("sort_order", {ascending: true}),
        supabase
          .from("homepage_deals")
          .select(
            "origin_code, origin_city, destination_code, destination_city, price, currency, airline_name, image_url, fare_type, expires_at"
          )
          .order("sort_order", {ascending: true}),
        supabase
          .from("homepage_settings")
          .select("key, value")
          .in("key", [
            "trust_items",
            "stats",
            "why_text",
            "cta_text",
            "section_copy",
            "footer_tagline"
          ])
      ]);

    const normalizedSettings = normalizeSettings(
      (settingsResult.data as Array<{key: string; value: string}> | null) ?? []
    );

    return brandHomepageData({
      banners: normalizeBanners(
        (bannersResult.data as Array<{
          cta_link: string | null;
          cta_text: string | null;
          image_url: string | null;
          subtitle: string | null;
          title: string;
        }> | null) ?? []
      ),
      copy: normalizedSettings.copy,
      deals: normalizeDeals(
        (dealsResult.data as Array<{
          airline_name: string;
          currency: SupportedCurrency;
          destination_city: string;
          destination_code: string;
          expires_at: string | null;
          fare_type: string | null;
          image_url: string | null;
          origin_city: string;
          origin_code: string;
          price: number;
        }> | null) ?? []
      ),
      destinations: normalizeDestinations(
        (destinationsResult.data as Array<{
          city: string;
          country: string;
          hotels_count: number | null;
          image_url: string | null;
          link: string | null;
          price_label: string | null;
        }> | null) ?? []
      ),
      hero: normalizeHero(
        (heroResult.data as {
          bg_image_url: string | null;
          cta_link: string;
          cta_text: string;
          headline: string;
          subheadline: string;
        } | null) ?? null
      ),
      services: fallbackServices,
      settings: normalizedSettings.settings
    }, branding);
  } catch {
    return brandHomepageData({
      banners: fallbackBanners,
      copy: fallbackCopy,
      deals: fallbackDeals,
      destinations: fallbackDestinations,
      hero: fallbackHero,
      services: fallbackServices,
      settings: fallbackSettings
    }, branding);
  }
}
