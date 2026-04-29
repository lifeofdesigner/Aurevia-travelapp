import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {getVisaCountryOption} from "@/features/visa/lib/catalog";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {listVisaApplicationsForUser} from "@/server/account/dashboard-service";

type VisaApplicationsPageProps = {
  params: {
    locale: Locale;
  };
};

function getCountryLabel(countryCode: string, locale: Locale) {
  const country = getVisaCountryOption(countryCode);

  if (!country) {
    return countryCode;
  }

  return locale === "de" ? country.localizedName : country.name;
}

export default async function VisaApplicationsPage({params}: VisaApplicationsPageProps) {
  const user = await requireAuthenticatedUser(params.locale, `/${params.locale}/dashboard/visa`);
  const [applications, t] = await Promise.all([
    listVisaApplicationsForUser(user.id),
    getTranslations({locale: params.locale, namespace: "Dashboard.visa"})
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>

      {applications.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-background/70">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="rounded-lg border border-border/80 bg-card/92 p-5 shadow-soft transition-colors hover:border-primary/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    {application.applicationReference ?? t("draftReference")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getCountryLabel(application.countryCode, params.locale)} |{" "}
                    {t(`visaTypeOptions.${application.visaType}`)}
                  </p>
                </div>
                <StatusBadge
                  label={t(`statusOptions.${application.status}`)}
                  status={application.status}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border/70 bg-background/70 p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {t("submittedLabel")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {application.submittedAt
                      ? formatDateTime(application.submittedAt, params.locale)
                      : t("notSubmitted")}
                  </p>
                </div>

                <Button asChild className="h-11 rounded-md px-5 text-xs uppercase tracking-[0.12em]">
                  <Link href={`/${params.locale}/dashboard/visa/${application.id}`}>
                    {t("viewDetailsAction")}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
