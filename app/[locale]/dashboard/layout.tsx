import {type Metadata} from "next";
import {type ReactNode} from "react";
import {getTranslations} from "next-intl/server";

import {SiteShell} from "@/components/shared/layout/site-shell";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getDashboardIdentity} from "@/server/account/dashboard-service";
import {DashboardNav} from "@/features/account/components/dashboard-nav";
import {PRIVATE_ROUTE_METADATA} from "@/lib/seo";

export const metadata: Metadata = PRIVATE_ROUTE_METADATA;

type DashboardLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

function getDisplayName(identity: Awaited<ReturnType<typeof getDashboardIdentity>>, fallback: string) {
  if (!identity) {
    return fallback;
  }

  const parts = [identity.firstName, identity.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : identity.email;
}

export default async function DashboardLayout({
  children,
  params
}: DashboardLayoutProps) {
  const user = await requireAuthenticatedUser(params.locale, `/${params.locale}/dashboard`);
  const [identity, t] = await Promise.all([
    getDashboardIdentity(user.id),
    getTranslations({locale: params.locale, namespace: "Dashboard.shell"})
  ]);

  return (
    <SiteShell locale={params.locale}>
      <main id="main-content" className="aurevia-section">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {t("eyebrow")}
            </p>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="space-y-3">
                <h1 className="font-display text-4xl tracking-[0.01em] text-foreground sm:text-5xl">
                  {t("title", {
                    name: getDisplayName(identity, user.email ?? "traveler")
                  })}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t("body")}
                </p>
              </div>
              <Card className="border-border/80 bg-card/92 shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t("identityTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    {getDisplayName(identity, user.email ?? "traveler")}
                  </p>
                  <p className="text-muted-foreground">{identity?.email ?? user.email}</p>
                  <p className="text-muted-foreground">{t("securityNotice")}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-8">
            <aside className="space-y-4">
              <Card className="border-border/80 bg-card/92 shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t("navigationTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DashboardNav locale={params.locale} />
                </CardContent>
              </Card>
              <Card className="border-border/80 bg-background/75 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("supportTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="leading-7">{t("supportBody")}</p>
                  <p className="font-medium text-foreground">{t("supportEmail")}</p>
                </CardContent>
              </Card>
            </aside>

            <div className="min-w-0 space-y-6">{children}</div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
