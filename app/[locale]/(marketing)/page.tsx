import {ArrowRight, Building2, Car, FileCheck2, Map, Plane, Route} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type HomePageProps = {
  params: {
    locale: Locale;
  };
};

const services = [
  {key: "flights", icon: Plane},
  {key: "hotels", icon: Building2},
  {key: "cars", icon: Car},
  {key: "transfers", icon: Route},
  {key: "tours", icon: Map},
  {key: "visa", icon: FileCheck2}
] as const;

export default async function HomePage({params}: HomePageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Home"});

  return (
    <main id="main-content">
      <section className="border-b bg-card">
        <div className="container grid gap-10 py-14 sm:py-18 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase text-primary">
              {t("eyebrow")}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {t("lead")}
              </p>
            </div>
            <Link
              href={getLocalizedPath(ROUTES.auth, params.locale)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/92"
            >
              {t("primaryAction")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-lg border bg-background p-5 shadow-soft">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-primary p-4 text-primary-foreground">
                <p className="text-2xl font-semibold">20%</p>
                <p className="mt-2 text-primary-foreground/82">{t("vatBaseline")}</p>
              </div>
              <div className="rounded-md bg-accent p-4 text-accent-foreground">
                <p className="text-2xl font-semibold">EUR</p>
                <p className="mt-2 text-accent-foreground/82">{t("currencyBaseline")}</p>
              </div>
              <div className="col-span-2 rounded-md border bg-card p-4">
                <p className="font-semibold">{t("globalOpsTitle")}</p>
                <p className="mt-2 text-muted-foreground">{t("globalOpsText")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="aurevia-section space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase text-primary">
            {t("servicesEyebrow")}
          </p>
          <h2 className="text-3xl font-semibold tracking-normal">
            {t("servicesTitle")}
          </h2>
          <p className="text-muted-foreground">{t("servicesLead")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({key, icon: Icon}) => (
            <Card key={key}>
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <CardTitle>{t(`services.${key}.title`)}</CardTitle>
                <CardDescription>{t(`services.${key}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`services.${key}.status`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
