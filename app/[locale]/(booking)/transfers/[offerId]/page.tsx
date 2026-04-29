import {BadgeCheck, Clock3, PlaneTakeoff, ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  formatTransferDateTime,
  formatTransferPrice,
  getTransferCapacityLabel
} from "@/features/transfers/lib/formatters";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getCachedTransferOffer} from "@/server/transfers/offer-service";

type TransferDetailPageProps = {
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

export default async function TransferDetailPage({
  params,
  searchParams
}: TransferDetailPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Transfers.detail"});
  const offer = await getCachedTransferOffer(params.offerId);

  if (!offer) {
    notFound();
  }

  const searchLogId = getSearchValue(searchParams, "searchLogId");
  const flightNumber = getSearchValue(searchParams, "flightNumber");
  const bookingParams = new URLSearchParams();

  if (searchLogId) {
    bookingParams.set("searchLogId", searchLogId);
  }

  if (flightNumber) {
    bookingParams.set("flightNumber", flightNumber);
  }

  const bookingHref = bookingParams.toString()
    ? `/${params.locale}/transfers/${offer.id}/book?${bookingParams.toString()}`
    : `/${params.locale}/transfers/${offer.id}/book`;

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={getLocalizedPath(ROUTES.transfers, params.locale)}
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
            <p className="text-sm text-muted-foreground">
              {t(`vehicleClassOptions.${offer.vehicleClass}`)} | {getTransferCapacityLabel(offer)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/92 px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("leadPriceLabel")}
          </p>
          <p className="mt-2 font-display text-4xl">
            {formatTransferPrice(offer, params.locale)}
          </p>
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
                  {t("pickupLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatTransferDateTime(offer.pickupAt, params.locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("routeModeLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {t(`routeModeOptions.${offer.routeMode}`)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("meetAndGreetLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {offer.meetAndGreetIncluded
                    ? t("meetAndGreetIncluded")
                    : t("meetAndGreetExcluded")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("capacityLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {getTransferCapacityLabel(offer)}
                </dd>
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
              <p>{offer.serviceSummary}</p>
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
              <CardTitle>{t("serviceDetailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("pickupLocationLabel")}</p>
                <p>{offer.pickupLocationLabel}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("dropoffLocationLabel")}</p>
                <p>{offer.dropoffLocationLabel}</p>
              </div>
              {flightNumber ? (
                <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                  <p className="inline-flex items-center gap-2 font-medium text-foreground">
                    <PlaneTakeoff aria-hidden="true" className="h-4 w-4 text-primary" />
                    {t("flightNumberLabel")}
                  </p>
                  <p>{flightNumber}</p>
                </div>
              ) : null}
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
                  {formatTransferPrice({totalAmount: offer.subtotalAmount}, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("taxesLabel")}</span>
                <span className="font-medium text-foreground">
                  {formatTransferPrice({totalAmount: offer.taxAmount}, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                <span className="font-semibold text-foreground">{t("totalLabel")}</span>
                <span className="font-display text-3xl text-foreground">
                  {formatTransferPrice(offer, params.locale)}
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
                <BadgeCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {offer.meetAndGreetIncluded
                  ? t("meetAndGreetIncluded")
                  : t("meetAndGreetExcluded")}
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
