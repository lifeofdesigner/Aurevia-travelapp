import {ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";

type AdminPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminPage({params}: AdminPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Admin"});

  return (
    <main id="main-content" className="aurevia-section">
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <CardTitle>{t("cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("cardBody")}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
