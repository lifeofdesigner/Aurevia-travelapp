"use client";

import {Check, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";

import {Button} from "@/components/ui/button";

const CONSENT_STORAGE_KEY = "aurevia-cookie-consent";

type ConsentValue = "accepted" | "declined";

export function CookieConsentBanner() {
  const t = useTranslations("CookieConsent");
  const [consent, setConsent] = useState<ConsentValue | null | "loading">(
    "loading"
  );

  useEffect(() => {
    const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    setConsent(
      storedConsent === "accepted" || storedConsent === "declined"
        ? storedConsent
        : null
    );
  }, []);

  function saveConsent(value: ConsentValue) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    setConsent(value);
  }

  if (consent !== null) {
    return null;
  }

  return (
    <section
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/98 px-4 py-4 text-card-foreground shadow-soft backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveConsent("declined")}
          >
            <X aria-hidden="true" className="h-4 w-4" />
            {t("decline")}
          </Button>
          <Button type="button" onClick={() => saveConsent("accepted")}>
            <Check aria-hidden="true" className="h-4 w-4" />
            {t("accept")}
          </Button>
        </div>
      </div>
    </section>
  );
}
