import {Clock3, ShieldCheck, Star, Users} from "lucide-react";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {type Locale} from "@/lib/i18n/routing";

import {
  formatTourDuration,
  getTourInclusionsSummary
} from "../lib/formatters";
import {type NormalizedTourOffer} from "../types";

type TourOfferCardProps = {
  detailHref: string;
  locale: Locale;
  offer: NormalizedTourOffer;
};

export function TourOfferCard({detailHref, locale, offer}: TourOfferCardProps) {
  const t = useTranslations("Tours.results");

  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
      <div
        aria-hidden="true"
        className="h-56 bg-cover bg-center"
        style={{backgroundImage: `url(${offer.images[0]})`}}
      />
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t(`categoryOptions.${offer.category}`)}
              </span>
              <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatTourDuration(offer.durationMinutes)}
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl tracking-[0.01em] text-foreground">
                {offer.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {offer.cityName}, {offer.countryName}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-background/80 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("fromLabel")}
            </p>
            <CurrencyAmount
              amountMinor={offer.priceFromTotalAmount.amountMinor}
              className="mt-2 block font-display text-3xl text-foreground"
              fromCurrency={offer.priceFromTotalAmount.currency}
              locale={locale}
            />
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/70 px-4 py-3">
            <Star aria-hidden="true" className="h-4 w-4 fill-accent text-accent" />
            <span>
              {offer.reviewRating.toFixed(1)} | {t("reviewsCount", {count: offer.reviewCount})}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/70 px-4 py-3">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
            <span>{formatTourDuration(offer.durationMinutes)}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/70 px-4 py-3">
            <Users aria-hidden="true" className="h-4 w-4 text-primary" />
            <span>
              {offer.privateAvailable ? t("privateAvailable") : t("sharedExperience")}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm leading-7 text-muted-foreground">
          <p>{offer.description}</p>
          <p>
            <span className="font-semibold text-foreground">{t("inclusionsLabel")}</span>{" "}
            {getTourInclusionsSummary(offer)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {offer.familyFriendly ? (
            <span className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t("familyFriendly")}
            </span>
          ) : null}
          {offer.groupFriendly ? (
            <span className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {t("groupFriendly")}
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
            <ShieldCheck aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 text-primary" />
            {t("cancellationLabel")}
          </span>
        </div>

        <div className="flex justify-end">
          <Button asChild className="rounded-lg px-6">
            <Link href={detailHref}>{t("detailCta")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
