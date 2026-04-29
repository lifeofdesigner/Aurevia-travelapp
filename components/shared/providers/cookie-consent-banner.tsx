"use client";

import Link from "next/link";
import {Check, Settings2, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_CONSENT_PREFERENCES,
  PRIVACY_SESSION_STORAGE_KEY,
  type CookieConsentPreferences,
  type StoredCookieConsent
} from "@/lib/privacy";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

function getStoredConsent() {
  try {
    const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredCookieConsent>;

    if (
      parsed.version !== 1 ||
      !parsed.sessionId ||
      !parsed.categories ||
      typeof parsed.categories.analytics !== "boolean" ||
      typeof parsed.categories.marketing !== "boolean"
    ) {
      return null;
    }

    return {
      categories: {
        analytics: parsed.categories.analytics,
        marketing: parsed.categories.marketing,
        necessary: true
      },
      locale: parsed.locale ?? "en",
      savedAt: parsed.savedAt ?? new Date().toISOString(),
      sessionId: parsed.sessionId,
      version: 1
    } satisfies StoredCookieConsent;
  } catch {
    return null;
  }
}

function getOrCreatePrivacySessionId() {
  const existingValue = window.localStorage.getItem(PRIVACY_SESSION_STORAGE_KEY);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = window.crypto.randomUUID();
  window.localStorage.setItem(PRIVACY_SESSION_STORAGE_KEY, nextValue);
  return nextValue;
}

function persistConsent({
  categories,
  locale,
  sessionId
}: {
  categories: CookieConsentPreferences;
  locale: string;
  sessionId: string;
}) {
  const storedConsent: StoredCookieConsent = {
    categories,
    locale,
    savedAt: new Date().toISOString(),
    sessionId,
    version: 1
  };

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(storedConsent)
  );

  return storedConsent;
}

export function CookieConsentBanner() {
  const locale = useLocale();
  const t = useTranslations("CookieConsent");
  const [storedConsent, setStoredConsent] = useState<StoredCookieConsent | null | "loading">(
    "loading"
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const customizeHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const existingConsent = getStoredConsent();
    setStoredConsent(existingConsent);
    setAnalyticsEnabled(existingConsent?.categories.analytics ?? false);
    setMarketingEnabled(existingConsent?.categories.marketing ?? false);
  }, []);

  useEffect(() => {
    if (isCustomizing) {
      customizeHeadingRef.current?.focus();
    }
  }, [isCustomizing]);

  async function submitConsent(preferences: CookieConsentPreferences) {
    const sessionId = getOrCreatePrivacySessionId();
    const nextConsent = persistConsent({categories: preferences, locale, sessionId});
    setStoredConsent(nextConsent);
    setIsCustomizing(false);

    try {
      await fetch("/api/privacy/consents", {
        body: JSON.stringify({
          analyticsCookies: preferences.analytics,
          locale,
          marketingCookies: preferences.marketing,
          sessionId
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
    } catch {
      // Local persistence remains the primary UX guard for the first-visit banner.
    }
  }

  if (storedConsent === "loading" || storedConsent !== null) {
    return null;
  }

  return (
    <section
      aria-describedby="cookie-consent-description"
      aria-labelledby="cookie-consent-title"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/98 px-4 py-4 text-card-foreground shadow-soft backdrop-blur"
      role="dialog"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 id="cookie-consent-title" className="text-base font-semibold text-foreground">
              {t("title")}
            </h2>
            <p id="cookie-consent-description" className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {t("description")}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Link
                className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={getLocalizedPath(ROUTES.cookies, locale as Locale)}
              >
                {t("cookiePolicyLink")}
              </Link>
              <Link
                className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={getLocalizedPath(ROUTES.privacy, locale as Locale)}
              >
                {t("privacyPolicyLink")}
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomizing((value) => !value)}
            >
              <Settings2 aria-hidden="true" className="h-4 w-4" />
              {isCustomizing ? t("closeCustomize") : t("customize")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submitConsent(DEFAULT_COOKIE_CONSENT_PREFERENCES)}
            >
              <X aria-hidden="true" className="h-4 w-4" />
              {t("reject")}
            </Button>
            <Button
              type="button"
              onClick={() =>
                submitConsent({
                  analytics: true,
                  marketing: true,
                  necessary: true
                })
              }
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              {t("accept")}
            </Button>
          </div>
        </div>

        {isCustomizing ? (
          <div className="rounded-lg border border-border/80 bg-background/70 p-5">
            <div className="space-y-4">
              <h3
                ref={customizeHeadingRef}
                className="font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                tabIndex={-1}
              >
                {t("customizeTitle")}
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="rounded-lg border border-border/80 bg-card/80 p-4">
                  <span className="flex items-start gap-3">
                    <input
                      checked
                      className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      disabled
                      type="checkbox"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-foreground">
                        {t("categories.necessary.title")}
                      </span>
                      <span className="block text-sm leading-7 text-muted-foreground">
                        {t("categories.necessary.body")}
                      </span>
                    </span>
                  </span>
                </label>

                <label className="rounded-lg border border-border/80 bg-card/80 p-4">
                  <span className="flex items-start gap-3">
                    <input
                      checked={analyticsEnabled}
                      className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-foreground">
                        {t("categories.analytics.title")}
                      </span>
                      <span className="block text-sm leading-7 text-muted-foreground">
                        {t("categories.analytics.body")}
                      </span>
                    </span>
                  </span>
                </label>

                <label className="rounded-lg border border-border/80 bg-card/80 p-4">
                  <span className="flex items-start gap-3">
                    <input
                      checked={marketingEnabled}
                      className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onChange={(event) => setMarketingEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-foreground">
                        {t("categories.marketing.title")}
                      </span>
                      <span className="block text-sm leading-7 text-muted-foreground">
                        {t("categories.marketing.body")}
                      </span>
                    </span>
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() =>
                    submitConsent({
                      analytics: analyticsEnabled,
                      marketing: marketingEnabled,
                      necessary: true
                    })
                  }
                >
                  {t("savePreferences")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
