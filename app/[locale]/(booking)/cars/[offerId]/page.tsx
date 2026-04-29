import {Clock3, Fuel, ShieldCheck, UserRound} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  formatCarDateTime,
  formatCarPrice,
  getCarRentalDurationLabel,
  getCarSpecsLabel
} from "@/features/cars/lib/formatters";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getCachedCarOffer} from "@/server/cars/offer-service";

type CarDetailPageProps = {
  params: {
    locale: Locale;
    offerId: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CarDetailPage({
  params,
  searchParams
}: CarDetailPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Cars.detail"});
  const offer = await getCachedCarOffer(params.offerId);

  if (!offer) {
    notFound();
  }

  const searchLogId = getSearchValue(searchParams, "searchLogId");
  const bookingHref =
    searchLogId && typeof searchLogId === "string"
      ? `/${params.locale}/cars/${offer.id}/book?searchLogId=${searchLogId}`
      : `/${params.locale}/cars/${offer.id}/book`;

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={getLocalizedPath(ROUTES.cars, params.locale)}
            className="text-sm font-semibold text-primary"
          >
            {t("backToResults")}
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {offer.vendorName}
            </p>
            <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">
              {offer.vehicleName}
            </h1>
            <p className="text-sm text-muted-foreground">{getCarSpecsLabel(offer)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/92 px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("leadPriceLabel")}
          </p>
          <p className="mt-2 font-display text-4xl">{formatCarPrice(offer, params.locale)}</p>
          <p className="text-sm text-muted-foreground">{t("leadPriceBody")}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div
          aria-hidden="true"
          className="min-h-[22rem] rounded-lg bg-cover bg-center"
          style={{backgroundImage: `url(${offer.imageUrl})`}}
        />

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("snapshotTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("durationLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {getCarRentalDurationLabel(offer)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("pickupLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatCarDateTime(offer.pickupAt, params.locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("dropoffLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatCarDateTime(offer.dropoffAt, params.locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <UserRound aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("driverAgeLabel")}
                </dt>
                <dd className="font-medium text-foreground">
                  {t("driverAgeValue", {age: offer.driverAgeMin})}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Fuel aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("fuelPolicyLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">{offer.fuelPolicy}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("overviewTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>{offer.rentalTermsSummary}</p>
              <div className="flex flex-wrap gap-2">
                {offer.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("rentalTermsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("fuelPolicyLabel")}</p>
                <p>{offer.fuelPolicy}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("mileagePolicyLabel")}</p>
                <p>{offer.mileagePolicy}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("insuranceLabel")}</p>
                <p>{offer.insuranceSummary}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("priceReviewTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("subtotalLabel")}</span>
                <span className="font-medium text-foreground">
                  {formatCarPrice({totalAmount: offer.subtotalAmount}, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("taxesLabel")}</span>
                <span className="font-medium text-foreground">
                  {formatCarPrice({totalAmount: offer.taxAmount}, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                <span className="font-semibold text-foreground">{t("totalLabel")}</span>
                <span className="font-display text-3xl text-foreground">
                  {formatCarPrice(offer, params.locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("actionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">{t("actionBody")}</p>
              <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {offer.insuranceSummary}
              </p>
              <Button asChild className="rounded-lg px-6">
                <Link href={bookingHref}>{t("bookAction")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
