import {LockKeyhole} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {CustomerAuthForm} from "@/features/account/components/customer-auth-form";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getDefaultCustomerAccessSettings} from "@/server/customer-access/settings";

type AuthPageProps = {
  params: {
    locale: Locale;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AuthPage({params, searchParams}: AuthPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Auth"});
  const nextParam = searchParams?.next;
  const nextPath =
    typeof nextParam === "string" && nextParam.startsWith("/")
      ? nextParam
      : getLocalizedPath(ROUTES.dashboard, params.locale);
  const accessSettings = getDefaultCustomerAccessSettings();

  return (
    <main
      id="main-content"
      className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12"
    >
      <Card className="w-full max-w-md border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </div>
          <CardTitle className="font-display text-3xl">{t("title")}</CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerAuthForm accessSettings={accessSettings} nextPath={nextPath} />
          <Button asChild variant="link" className="w-full">
            <Link href={getLocalizedPath(ROUTES.home, params.locale)}>
              {t("backHome")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
