import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {VisaStatusTracker} from "@/features/visa/components/visa-status-tracker";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatDate, formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getVisaApplicationDetailForUser} from "@/server/account/dashboard-service";

type VisaApplicationDetailPageProps = {
  params: {
    applicationId: string;
    locale: Locale;
  };
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function VisaApplicationDetailPage({
  params
}: VisaApplicationDetailPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/visa/${params.applicationId}`
  );
  const [application, t] = await Promise.all([
    getVisaApplicationDetailForUser(user.id, params.applicationId),
    getTranslations({locale: params.locale, namespace: "Dashboard.visaDetail"})
  ]);

  if (!application) {
    notFound();
  }

  const formData = application.formData;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${params.locale}/dashboard/visa`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("backAction")}
          </Link>
          <h2 className="font-display text-3xl text-foreground">
            {application.applicationReference ?? t("draftReference")}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
        </div>
        <StatusBadge
          label={t(`statusOptions.${application.status}`)}
          status={application.status}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("snapshotTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("destinationLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">{application.countryCode}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("createdLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {formatDate(application.createdAt, params.locale)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("submittedLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {application.submittedAt
                    ? formatDateTime(application.submittedAt, params.locale)
                    : t("notSubmitted")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("uploadsLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {t("uploadCountValue", {count: application.uploadCount})}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("applicantTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("applicantNameLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {`${asString(formData.firstName)} ${asString(formData.lastName)}`.trim() ||
                    t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("nationalityLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.nationalityCountryCode) || t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("passportNumberLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.passportNumber) || t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("purposeLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.purposeOfTravel) || t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("travelWindowLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.intendedArrivalDate) && asString(formData.intendedDepartureDate)
                    ? `${formatDate(asString(formData.intendedArrivalDate), params.locale)} - ${formatDate(asString(formData.intendedDepartureDate), params.locale)}`
                    : t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("companionsLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {t("companionsValue", {count: asArray(formData.companions).length})}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("emailLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.email) || t("emptyValue")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("phoneLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {asString(formData.phone) || t("emptyValue")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("documentsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.uploads.length === 0 ? (
                <p className="text-sm leading-7 text-muted-foreground">{t("documentsEmpty")}</p>
              ) : (
                application.uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{upload.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {upload.documentType} | {formatDateTime(upload.createdAt, params.locale)}
                      </p>
                    </div>
                    <a
                      href={upload.accessPath}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("documentAction")}
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <VisaStatusTracker
            locale={params.locale}
            reviewedAt={application.reviewedAt}
            status={application.status}
            submittedAt={application.submittedAt}
            updatedAt={application.updatedAt}
          />

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("privacyTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="leading-7 text-muted-foreground">{t("privacyBody")}</p>
              <p className="leading-7 text-muted-foreground">{t("privacyNote")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
