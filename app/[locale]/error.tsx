"use client";

import {useTranslations} from "next-intl";

import {Button} from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & {digest?: string};
  reset: () => void;
};

export default function ErrorPage({error, reset}: ErrorPageProps) {
  const t = useTranslations("Errors");

  return (
    <main
      id="main-content"
      className="container flex min-h-screen items-center justify-center py-12"
    >
      <div className="max-w-md space-y-5 text-center">
        <p className="text-sm font-semibold uppercase text-destructive">
          {error.digest ? t("errorReference", {digest: error.digest}) : t("errorLabel")}
        </p>
        <h1 className="font-display text-4xl tracking-[0.01em]">{t("errorTitle")}</h1>
        <p className="leading-7 text-muted-foreground">{t("errorDescription")}</p>
        <Button type="button" onClick={reset}>
          {t("retryAction")}
        </Button>
      </div>
    </main>
  );
}
