import {LockKeyhole} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type AuthPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AuthPage({params}: AuthPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Auth"});

  return (
    <main
      id="main-content"
      className="container flex min-h-screen items-center justify-center py-12"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              disabled
            />
          </div>
          <Button type="button" className="w-full" disabled>
            {t("submit")}
          </Button>
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
