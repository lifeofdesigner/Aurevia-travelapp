"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useEffect, useMemo, useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {type Locale} from "@/lib/i18n/routing";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  PRIVACY_SESSION_STORAGE_KEY,
  type StoredCookieConsent
} from "@/lib/privacy";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {type PrivacyCenterRecord, type PrivacyDataRequestFormValues, type PrivacyPreferencesFormValues} from "@/features/account/types";

import {
  createPrivacyDataRequestSchema,
  privacyPreferencesSchema
} from "../lib/privacy-schemas";
import {StatusBadge} from "@/components/shared/feedback/status-badge";

type PrivacyPreferencesFormProps = {
  initialValues: PrivacyCenterRecord;
  locale: Locale;
};

function readStoredConsent() {
  try {
    const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredCookieConsent>;

    if (
      parsed.version !== 1 ||
      !parsed.categories ||
      typeof parsed.categories.analytics !== "boolean" ||
      typeof parsed.categories.marketing !== "boolean"
    ) {
      return null;
    }

    return parsed as StoredCookieConsent;
  } catch {
    return null;
  }
}

function getOrCreateSessionId() {
  const existingValue = window.localStorage.getItem(PRIVACY_SESSION_STORAGE_KEY);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = window.crypto.randomUUID();
  window.localStorage.setItem(PRIVACY_SESSION_STORAGE_KEY, nextValue);
  return nextValue;
}

export function PrivacyPreferencesForm({
  initialValues,
  locale
}: PrivacyPreferencesFormProps) {
  const t = useTranslations("Dashboard.privacy");
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const preferencesForm = useForm<PrivacyPreferencesFormValues>({
    defaultValues: {
      analyticsCookies: initialValues.cookiePreferences.analytics,
      marketingCookies: initialValues.cookiePreferences.marketing,
      marketingEmailOptIn: initialValues.marketingEmailOptIn,
      profilingOptIn: initialValues.profilingOptIn
    },
    resolver: zodResolver(privacyPreferencesSchema.omit({locale: true, sessionId: true}))
  });
  const requestSchema = useMemo(
    () =>
      createPrivacyDataRequestSchema({
        detailsTooLong: t("requestValidation.detailsTooLong"),
        requestTypeRequired: t("requestValidation.requestTypeRequired")
      }),
    [t]
  );
  const requestForm = useForm<PrivacyDataRequestFormValues>({
    defaultValues: {
      details: "",
      requestType: "portability"
    },
    resolver: zodResolver(requestSchema)
  });
  const legalDocuments =
    initialValues.legalDocuments.length > 0
      ? initialValues.legalDocuments
      : [
          {
            documentKey: "privacy_policy" as const,
            effectiveAt: null,
            title: t("fallbackLegal.privacy"),
            version: null
          },
          {
            documentKey: "terms_of_use" as const,
            effectiveAt: null,
            title: t("fallbackLegal.terms"),
            version: null
          },
          {
            documentKey: "cookie_policy" as const,
            effectiveAt: null,
            title: t("fallbackLegal.cookies"),
            version: null
          },
          {
            documentKey: "refund_policy" as const,
            effectiveAt: null,
            title: t("fallbackLegal.refunds"),
            version: null
          }
        ];

  useEffect(() => {
    const nextSessionId = getOrCreateSessionId();
    setSessionId(nextSessionId);
    const storedConsent = readStoredConsent();

    if (storedConsent) {
      preferencesForm.reset({
        analyticsCookies: storedConsent.categories.analytics,
        marketingCookies: storedConsent.categories.marketing,
        marketingEmailOptIn: initialValues.marketingEmailOptIn,
        profilingOptIn: initialValues.profilingOptIn
      });
    }
  }, [initialValues.marketingEmailOptIn, initialValues.profilingOptIn, preferencesForm]);

  async function handlePreferencesSubmit(values: PrivacyPreferencesFormValues) {
    const resolvedSessionId = sessionId || getOrCreateSessionId();

    const response = await fetch("/api/privacy/preferences", {
      body: JSON.stringify({
        ...values,
        locale,
        sessionId: resolvedSessionId
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });
    const result = (await response.json()) as {message?: string};

    if (!response.ok) {
      toast.error(t("saveErrorTitle"), {
        description: result.message ?? t("saveErrorDescription")
      });
      return;
    }

    const storedConsent: StoredCookieConsent = {
      categories: {
        analytics: values.analyticsCookies,
        marketing: values.marketingCookies,
        necessary: true
      },
      locale,
      savedAt: new Date().toISOString(),
      sessionId: resolvedSessionId,
      version: 1
    };

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(storedConsent));
    toast.success(t("saveSuccessTitle"), {
      description: t("saveSuccessDescription")
    });
    router.refresh();
  }

  async function handleRequestSubmit(values: PrivacyDataRequestFormValues) {
    const response = await fetch("/api/privacy/data-requests", {
      body: JSON.stringify(values),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const result = (await response.json()) as {message?: string};

    if (!response.ok) {
      toast.error(t("requestErrorTitle"), {
        description: result.message ?? t("requestErrorDescription")
      });
      return;
    }

    toast.success(t("requestSuccessTitle"), {
      description: t("requestSuccessDescription")
    });
    requestForm.reset({
      details: "",
      requestType: values.requestType
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form className="space-y-6" onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} noValidate>
        <section className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-5">
          <div className="space-y-1">
            <h3 className="font-display text-2xl text-foreground">{t("cookieTitle")}</h3>
            <p className="text-sm leading-7 text-muted-foreground">{t("cookieBody")}</p>
          </div>
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
                  <span className="block font-medium text-foreground">{t("cookies.necessaryTitle")}</span>
                  <span className="block text-sm leading-7 text-muted-foreground">{t("cookies.necessaryBody")}</span>
                </span>
              </span>
            </label>

            <label className="rounded-lg border border-border/80 bg-card/80 p-4">
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  type="checkbox"
                  {...preferencesForm.register("analyticsCookies")}
                />
                <span className="space-y-1">
                  <span className="block font-medium text-foreground">{t("cookies.analyticsTitle")}</span>
                  <span className="block text-sm leading-7 text-muted-foreground">{t("cookies.analyticsBody")}</span>
                </span>
              </span>
            </label>

            <label className="rounded-lg border border-border/80 bg-card/80 p-4">
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  type="checkbox"
                  {...preferencesForm.register("marketingCookies")}
                />
                <span className="space-y-1">
                  <span className="block font-medium text-foreground">{t("cookies.marketingTitle")}</span>
                  <span className="block text-sm leading-7 text-muted-foreground">{t("cookies.marketingBody")}</span>
                </span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={getLocalizedPath(ROUTES.cookies, locale)}
            >
              {t("cookiePolicyAction")}
            </Link>
            <Link
              className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={getLocalizedPath(ROUTES.privacy, locale)}
            >
              {t("privacyPolicyAction")}
            </Link>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-5">
          <div className="space-y-1">
            <h3 className="font-display text-2xl text-foreground">{t("communicationsTitle")}</h3>
            <p className="text-sm leading-7 text-muted-foreground">{t("communicationsBody")}</p>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-card/80 p-4">
            <input
              className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              type="checkbox"
              {...preferencesForm.register("marketingEmailOptIn")}
            />
            <span className="space-y-1">
              <span className="block font-medium text-foreground">{t("communications.marketingTitle")}</span>
              <span className="block text-sm leading-7 text-muted-foreground">{t("communications.marketingBody")}</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-card/80 p-4">
            <input
              className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              type="checkbox"
              {...preferencesForm.register("profilingOptIn")}
            />
            <span className="space-y-1">
              <span className="block font-medium text-foreground">{t("communications.profilingTitle")}</span>
              <span className="block text-sm leading-7 text-muted-foreground">{t("communications.profilingBody")}</span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button disabled={preferencesForm.formState.isSubmitting} type="submit">
            {preferencesForm.formState.isSubmitting ? t("saving") : t("saveAction")}
          </Button>
        </div>
      </form>

      <section className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-5">
        <div className="space-y-1">
          <h3 className="font-display text-2xl text-foreground">{t("requestsTitle")}</h3>
          <p className="text-sm leading-7 text-muted-foreground">{t("requestsBody")}</p>
        </div>
        <form className="space-y-4" onSubmit={requestForm.handleSubmit(handleRequestSubmit)} noValidate>
          <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="privacy-request-type">{t("requestTypeLabel")}</Label>
              <Select id="privacy-request-type" {...requestForm.register("requestType")}>
                <option value="portability">{t("requestTypeOptions.portability")}</option>
                <option value="erasure">{t("requestTypeOptions.erasure")}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy-request-details">{t("requestDetailsLabel")}</Label>
              <Textarea
                id="privacy-request-details"
                rows={4}
                aria-invalid={requestForm.formState.errors.details ? "true" : "false"}
                aria-describedby={
                  requestForm.formState.errors.details ? "privacy-request-details-error" : undefined
                }
                {...requestForm.register("details")}
              />
              <FormFieldError
                id="privacy-request-details-error"
                message={requestForm.formState.errors.details?.message}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={requestForm.formState.isSubmitting} type="submit">
              {requestForm.formState.isSubmitting ? t("requestSubmitting") : t("requestSubmitAction")}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-display text-2xl text-foreground">{t("requestHistoryTitle")}</h3>
          <p className="text-sm leading-7 text-muted-foreground">{t("requestHistoryBody")}</p>
        </div>
        {initialValues.dataRequests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {initialValues.dataRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-border/80 bg-card/92 p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      {t(`requestTypeOptions.${request.requestType}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("requestSubmittedAt", {date: new Date(request.createdAt).toLocaleDateString(locale)})}
                    </p>
                  </div>
                  <StatusBadge
                    label={t(`statusOptions.${request.status}`)}
                    status={request.status}
                  />
                </div>
                {typeof request.requestDetails.details === "string" && request.requestDetails.details.length > 0 ? (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {request.requestDetails.details}
                  </p>
                ) : null}
                {request.responseSummary ? (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    <span className="font-medium text-foreground">{t("responseSummaryLabel")}: </span>
                    {request.responseSummary}
                  </p>
                ) : null}
                {request.rejectedReason ? (
                  <p className="mt-2 text-sm leading-7 text-destructive">
                    <span className="font-medium">{t("rejectedReasonLabel")}: </span>
                    {request.rejectedReason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-5">
        <div className="space-y-1">
          <h3 className="font-display text-2xl text-foreground">{t("legalTitle")}</h3>
          <p className="text-sm leading-7 text-muted-foreground">{t("legalBody")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {legalDocuments.map((document) => (
            <Link
              key={`${document.documentKey}-${document.version ?? "preview"}`}
              href={getLocalizedPath(
                document.documentKey === "privacy_policy"
                  ? ROUTES.privacy
                  : document.documentKey === "terms_of_use"
                    ? ROUTES.terms
                    : document.documentKey === "cookie_policy"
                      ? ROUTES.cookies
                      : ROUTES.refunds,
                locale
              )}
              className="rounded-lg border border-border/80 bg-card/80 p-4 no-underline transition-colors hover:border-primary/30 hover:bg-card"
            >
              <p className="font-medium text-foreground">{document.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {document.version ? t("legalVersion", {version: document.version}) : t("legalPreview")}
              </p>
            </Link>
          ))}
        </div>
        <p className="text-sm leading-7 text-muted-foreground">{t("reviewNotice")}</p>
      </section>
    </div>
  );
}
