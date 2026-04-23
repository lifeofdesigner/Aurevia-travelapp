import "@/app/globals.css";

import {type Metadata} from "next";
import {Inter} from "next/font/google";
import {NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations} from "next-intl/server";
import {notFound} from "next/navigation";
import {type ReactNode} from "react";

import {SkipLink} from "@/components/shared/layout/skip-link";
import {AppProviders} from "@/components/shared/providers/app-providers";
import {CookieConsentBanner} from "@/components/shared/providers/cookie-consent-banner";
import {getPublicEnv} from "@/lib/env/client";
import {isSupportedLocale, locales, type Locale} from "@/lib/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export async function generateMetadata({params}: LocaleParams): Promise<Metadata> {
  const locale: Locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({locale, namespace: "Metadata"});
  const env = getPublicEnv();

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`
    },
    description: t("description")
  };
}

export default async function LocaleLayout({children, params}: LocaleLayoutProps) {
  if (!isSupportedLocale(params.locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations({
    locale: params.locale,
    namespace: "Accessibility"
  });

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <NextIntlClientProvider locale={params.locale} messages={messages}>
          <AppProviders>
            <SkipLink label={t("skipToContent")} />
            {children}
            <CookieConsentBanner />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
