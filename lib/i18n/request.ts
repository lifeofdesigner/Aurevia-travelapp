import {getRequestConfig} from "next-intl/server";

import {
  defaultLocale,
  isSupportedLocale,
  type Locale
} from "@/lib/i18n/routing";

export default getRequestConfig(async ({requestLocale}) => {
  const requestedLocale = await requestLocale;
  const locale: Locale = isSupportedLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Vienna"
  };
});
