import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {PrivacyPreferencesForm} from "@/features/account/components/privacy-preferences-form";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getPrivacyPreferenceSnapshotForUser} from "@/server/privacy/consent-service";
import {listDataRequestsForUser} from "@/server/privacy/data-request-service";
import {listPublishedLegalDocumentSummaries} from "@/server/privacy/legal-service";

type PrivacyPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function DashboardPrivacyPage({params}: PrivacyPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/privacy`
  );
  const [preferences, dataRequests, legalDocuments, t] = await Promise.all([
    getPrivacyPreferenceSnapshotForUser(user.id),
    listDataRequestsForUser(user.id),
    listPublishedLegalDocumentSummaries(params.locale),
    getTranslations({locale: params.locale, namespace: "Dashboard.privacy"})
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{t("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivacyPreferencesForm
            initialValues={{
              cookiePreferences: preferences.cookiePreferences,
              dataRequests,
              legalDocuments,
              marketingEmailOptIn: preferences.marketingEmailOptIn,
              profilingOptIn: preferences.profilingOptIn
            }}
            locale={params.locale}
          />
        </CardContent>
      </Card>
    </section>
  );
}
