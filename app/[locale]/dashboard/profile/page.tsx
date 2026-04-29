import {getTranslations} from "next-intl/server";

import {ProfileSettingsForm} from "@/features/account/components/profile-settings-form";
import {SignOutButton} from "@/features/account/components/sign-out-button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {
  getProfileSettingsForUser,
  listAccountCountries
} from "@/server/account/dashboard-service";
import {notFound} from "next/navigation";

type ProfilePageProps = {
  params: {
    locale: Locale;
  };
};

export default async function ProfilePage({params}: ProfilePageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/profile`
  );
  const [profile, countries, t] = await Promise.all([
    getProfileSettingsForUser(user.id),
    listAccountCountries(),
    getTranslations({locale: params.locale, namespace: "Dashboard.profile"})
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{t("settingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm countries={countries} initialValues={profile} locale={params.locale} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("accountCardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("emailLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">{profile.email}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("roleLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {t(`roleOptions.${profile.role}`)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("emailVerifiedLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {profile.emailVerifiedAt
                    ? formatDateTime(profile.emailVerifiedAt, params.locale)
                    : t("emailNotVerified")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("lastSignedInLabel")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {profile.lastSignedInAt
                    ? formatDateTime(profile.lastSignedInAt, params.locale)
                    : t("lastSignedInFallback")}
                </p>
              </div>
              <div className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("securityTitle")}</p>
                <p className="leading-7 text-muted-foreground">{t("securityBody")}</p>
                <SignOutButton locale={params.locale} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
