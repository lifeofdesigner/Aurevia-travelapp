import {type MetadataRoute} from "next";

import {locales} from "@/lib/i18n/routing";
import {ROUTES, type AppRoute, getLocalizedPath} from "@/lib/routes";
import {getMetadataBase} from "@/lib/seo";

const publicRoutes: AppRoute[] = [
  ROUTES.home,
  ROUTES.flights,
  ROUTES.hotels,
  ROUTES.cars,
  ROUTES.transfers,
  ROUTES.tours,
  ROUTES.visa,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.cookies,
  ROUTES.refunds
];

export default function sitemap(): MetadataRoute.Sitemap {
  const metadataBase = getMetadataBase();
  const lastModified = new Date();

  return publicRoutes.flatMap((route) =>
    locales.map((locale) => ({
      changeFrequency: route === ROUTES.home ? "daily" : "weekly",
      lastModified,
      priority: route === ROUTES.home ? 1 : route === ROUTES.privacy ? 0.4 : 0.8,
      url: new URL(getLocalizedPath(route, locale), metadataBase).toString()
    }))
  );
}
