import {type Metadata} from "next";
import {type ReactNode} from "react";
import {getTranslations} from "next-intl/server";

import {SiteShell} from "@/components/shared/layout/site-shell";
import {type Locale} from "@/lib/i18n/routing";
import {AdminSidebar} from "@/features/admin/components/admin-sidebar";
import {AdminSessionProvider} from "@/features/admin/components/admin-session-provider";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {AdminAuthorizationError, requireAdminSession} from "@/lib/auth/admin-auth";
import {PRIVATE_ROUTE_METADATA} from "@/lib/seo";

export const metadata: Metadata = PRIVATE_ROUTE_METADATA;

type AdminLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

function getAdminDisplayName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

async function renderForbiddenState(locale: Locale) {
  const t = await getTranslations({locale, namespace: "Admin.shell"});

  return (
    <SiteShell headerAuthMode="none" locale={locale}>
      <main id="main-content" className="aurevia-section">
        <div className="mx-auto max-w-3xl">
          <Card className="border-border bg-card shadow-soft">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("forbiddenEyebrow")}
              </p>
              <CardTitle className="font-display text-4xl italic text-foreground">
                {t("forbiddenTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t("forbiddenBody")}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </SiteShell>
  );
}

export default async function AdminLayout({children, params}: AdminLayoutProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Admin.shell"});
  let session: Awaited<ReturnType<typeof requireAdminSession>>;

  try {
    session = await requireAdminSession();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return renderForbiddenState(params.locale);
    }

    throw error;
  }

  const displayName = getAdminDisplayName(session.fullName, session.user.email ?? "");

  return (
    <SiteShell headerAuthMode="none" locale={params.locale}>
      <main id="main-content" className="aurevia-section">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {t("eyebrow")}
            </p>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="space-y-3">
                <h1 className="font-display text-4xl tracking-[0.01em] text-foreground sm:text-5xl">
                  {t("title", {name: displayName})}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t("body")}
                </p>
              </div>
              <Card className="border-border/80 bg-card/92 shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t("identityTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium text-foreground">{displayName}</p>
                    <StatusBadge label={t(`roleOptions.${session.role}`)} status={session.role} />
                  </div>
                  <p className="text-muted-foreground">{session.user.email}</p>
                  <p className="text-muted-foreground">{t("securityNotice")}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[5.25rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-8">
            <aside className="space-y-4">
              <AdminSidebar role={session.role} />
            </aside>
            <AdminSessionProvider
              value={{
                email: session.user.email ?? "",
                fullName: session.fullName,
                role: session.role,
                userId: session.user.id
              }}
            >
              <div className="min-w-0 space-y-6">{children}</div>
            </AdminSessionProvider>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
