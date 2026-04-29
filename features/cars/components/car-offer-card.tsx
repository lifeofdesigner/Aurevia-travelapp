import {ArrowRight, CarFront, Gauge, ShieldCheck} from "lucide-react";
import Link from "next/link";
import {useTranslations} from "next-intl";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {CurrencyAmount} from "@/lib/currency/use-currency";

import {
  formatCarDateTime,
  getCarRentalDurationLabel,
  getCarSpecsLabel
} from "../lib/formatters";
import {type NormalizedCarOffer} from "../types";

type CarOfferCardProps = {
  detailHref: string;
  locale: string;
  offer: NormalizedCarOffer;
};

export function CarOfferCard({detailHref, locale, offer}: CarOfferCardProps) {
  const t = useTranslations("Cars.results");

  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[240px_1fr]">
        <div
          aria-hidden="true"
          className="min-h-[16rem] bg-cover bg-center"
          style={{backgroundImage: `url(${offer.imageUrl})`}}
        />

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {offer.vendorName}
              </p>
              <div className="space-y-1">
                <h3 className="font-display text-3xl tracking-[0.01em] text-foreground">
                  {offer.vehicleName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`categoryOptions.${offer.vehicleCategory}`)} | {getCarSpecsLabel(offer)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("fromLabel")}
              </p>
              <CurrencyAmount
                amountMinor={offer.totalAmount.amountMinor}
                className="mt-2 block font-display text-4xl text-foreground"
                fromCurrency={offer.totalAmount.currency}
                locale={locale}
              />
              <p className="text-sm text-muted-foreground">{t("totalRentalPrice")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <CarFront aria-hidden="true" className="h-4 w-4 text-primary" />
                {t("pickupLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{offer.pickupLocationLabel}</p>
              <p className="text-sm text-muted-foreground">
                {formatCarDateTime(offer.pickupAt, locale)}
              </p>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Gauge aria-hidden="true" className="h-4 w-4 text-primary" />
                {t("dropoffLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{offer.dropoffLocationLabel}</p>
              <p className="text-sm text-muted-foreground">
                {formatCarDateTime(offer.dropoffAt, locale)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <dl className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <dt>{t("durationLabel")}</dt>
                  <dd className="font-medium text-foreground">
                    {getCarRentalDurationLabel(offer)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>{t("fuelPolicyLabel")}</dt>
                  <dd className="text-right font-medium text-foreground">{offer.fuelPolicy}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>{t("driverAgeLabel")}</dt>
                  <dd className="font-medium text-foreground">
                    {t("driverAgeValue", {age: offer.driverAgeMin})}
                  </dd>
                </div>
              </dl>

              <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {offer.rentalTermsSummary}
              </p>

              <div className="flex flex-wrap gap-2">
                {offer.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>

            <Button asChild className="rounded-lg px-6">
              <Link href={detailHref}>
                {t("detailCta")}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
