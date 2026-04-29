import {type Metadata} from "next";

import {getPublicEnv} from "@/lib/env/client";
import {locales, type Locale} from "@/lib/i18n/routing";
import {type AppRoute, getLocalizedPath} from "@/lib/routes";

export const PRIVATE_ROUTE_METADATA: Metadata = {
  description:
    "Secure account, checkout, dashboard, and admin pages for managing bookings, payments, support, and internal operations.",
  openGraph: {
    description:
      "Secure account, checkout, dashboard, and admin pages for managing bookings, payments, support, and internal operations.",
    title: "Private workspace"
  },
  robots: {
    follow: false,
    index: false,
    nocache: true,
    googleBot: {
      follow: false,
      index: false,
      noimageindex: true
    }
  },
  title: "Private workspace",
  twitter: {
    card: "summary_large_image",
    description:
      "Secure account, checkout, dashboard, and admin pages for managing bookings, payments, support, and internal operations.",
    title: "Private workspace"
  }
};

export const BOOKING_ROUTE_METADATA: Metadata = {
  description:
    "Search and book flights, hotels, cars, tours, transfers, and visa support.",
  openGraph: {
    description:
      "Search and book flights, hotels, cars, tours, transfers, and visa support.",
    title: "Plan and book travel"
  },
  title: "Plan and book travel",
  twitter: {
    card: "summary_large_image",
    description:
      "Search and book flights, hotels, cars, tours, transfers, and visa support.",
    title: "Plan and book travel"
  }
};

export const MARKETING_ROUTE_METADATA: Metadata = {
  description:
    "Explore travel planning, review legal information, and discover premium international travel services.",
  openGraph: {
    description:
      "Explore travel planning, review legal information, and discover premium international travel services.",
    title: "Explore travel services"
  },
  title: "Explore travel services",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore travel planning, review legal information, and discover premium international travel services.",
    title: "Explore travel services"
  }
};

export function getMetadataBase() {
  return new URL(getPublicEnv().NEXT_PUBLIC_APP_URL);
}

export function buildLocaleAlternates(route: AppRoute) {
  const metadataBase = getMetadataBase();

  return {
    languages: Object.fromEntries(
      locales.map((locale) => [
        locale,
        new URL(getLocalizedPath(route, locale), metadataBase).toString()
      ])
    )
  };
}

export function buildCanonicalUrl(route: AppRoute, locale: Locale) {
  return new URL(getLocalizedPath(route, locale), getMetadataBase());
}
