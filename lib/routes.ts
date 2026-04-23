import {type Locale} from "@/lib/i18n/routing";

export const ROUTES = {
  home: "/",
  auth: "/auth",
  dashboard: "/dashboard",
  admin: "/admin",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  refunds: "/refunds"
} as const;

export type RouteKey = keyof typeof ROUTES;
export type AppRoute = (typeof ROUTES)[RouteKey];

export function getLocalizedPath(route: AppRoute, locale: Locale) {
  const suffix = route === "/" ? "" : route;
  return `/${locale}${suffix}`;
}
