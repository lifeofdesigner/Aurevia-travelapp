import {defineRouting} from "next-intl/routing";

export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export function isSupportedLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
