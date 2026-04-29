import "@/app/globals.css";

import {type Metadata} from "next";
import {cookies} from "next/headers";
import {Inter, Libre_Franklin} from "next/font/google";
import {NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations} from "next-intl/server";
import {notFound} from "next/navigation";
import {type ReactNode} from "react";

import {SkipLink} from "@/components/shared/layout/skip-link";
import {AppProviders} from "@/components/shared/providers/app-providers";
import {CookieConsentBanner} from "@/components/shared/providers/cookie-consent-banner";
import {CURRENCY_COOKIE_NAME, normalizeDisplayCurrency} from "@/lib/currency/config";
import {getPublicEnv} from "@/lib/env/client";
import {isSupportedLocale, locales, type Locale} from "@/lib/i18n/routing";
import {ROUTES} from "@/lib/routes";
import {buildLocaleAlternates} from "@/lib/seo";
import {buildMetadataIcons, getSiteBranding} from "@/server/brand/site-branding";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: {
    locale: string;
  };
};

type LocaleParams = {
  params: {
    locale: string;
  };
};

function rewriteBrandTokens(value: string, branding: Awaited<ReturnType<typeof getSiteBranding>>) {
  const firstBrandWord = branding.siteName.trim().split(/\s+/)[0] || branding.siteName;

  return value
    .replaceAll("Aurevia Travel", branding.siteName)
    .replace(/\bAurevia\b/g, firstBrandWord)
    .replaceAll("Vienna, Austria", branding.businessLocation)
    .replaceAll("Wien, Oesterreich", branding.businessLocation)
    .replaceAll("Vienna-based", `${branding.businessCity}-based`)
    .replaceAll("Vienna based", `${branding.businessCity} based`)
    .replaceAll("from Vienna", `from ${branding.businessCity}`)
    .replaceAll("aus Wien", `aus ${branding.businessCity}`);
}

function rewriteMessagesForBranding(
  value: unknown,
  branding: Awaited<ReturnType<typeof getSiteBranding>>
): unknown {
  if (typeof value === "string") {
    return rewriteBrandTokens(value, branding);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewriteMessagesForBranding(entry, branding));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewriteMessagesForBranding(entry, branding)
      ])
    );
  }

  return value;
}

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export async function generateMetadata({params}: LocaleParams): Promise<Metadata> {
  const locale: Locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const env = getPublicEnv();
  const branding = await getSiteBranding();

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    alternates: buildLocaleAlternates(ROUTES.home),
    applicationName: branding.siteName,
    icons: buildMetadataIcons(branding.faviconUrl),
    title: {
      default: branding.siteName,
      template: `%s | ${branding.siteName}`
    },
    description: branding.tagline,
    openGraph: {
      description: branding.tagline,
      locale,
      siteName: branding.siteName,
      title: branding.siteName,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      description: branding.tagline,
      title: branding.siteName
    }
  };
}

export default async function LocaleLayout({children, params}: LocaleLayoutProps) {
  if (!isSupportedLocale(params.locale)) {
    notFound();
  }

  const cookieStore = cookies();
  const [messages, branding] = await Promise.all([getMessages(), getSiteBranding()]);
  const t = await getTranslations({
    locale: params.locale,
    namespace: "Accessibility"
  });
  const initialCurrency = normalizeDisplayCurrency(
    cookieStore.get(CURRENCY_COOKIE_NAME)?.value
  );

  return (
    <html
      lang={params.locale}
      suppressHydrationWarning
      data-site-theme={branding.websiteTheme}
      className={`${libreFranklin.variable} ${inter.variable}`}
    >
      <body className="font-sans">
        <NextIntlClientProvider
          locale={params.locale}
          messages={rewriteMessagesForBranding(messages, branding) as typeof messages}
        >
          <AppProviders initialCurrency={initialCurrency}>
            <SkipLink label={t("skipToContent")} />
            {children}
            <CookieConsentBanner />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
