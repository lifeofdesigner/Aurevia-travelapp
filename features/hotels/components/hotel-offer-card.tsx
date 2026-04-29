import {Coffee, MapPin, ShieldCheck, Sparkles, Star} from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {type Locale} from "@/lib/i18n/routing";

import {formatHotelStayDates} from "../lib/formatters";
import {type FilteredHotelOffer} from "../lib/results";

type HotelOfferCardProps = {
  detailHref: string;
  locale: Locale;
  offer: FilteredHotelOffer;
};

export function HotelOfferCard({detailHref, locale, offer}: HotelOfferCardProps) {
  const t = useTranslations("Hotels.results");

  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
      <div className="grid lg:grid-cols-[320px_1fr]">
        <div className="relative min-h-[250px] bg-muted">
          <Image
            src={offer.images[0]}
            alt={offer.propertyName}
            className="absolute inset-0 h-full w-full object-cover"
            fill
            sizes="(min-width: 1024px) 320px, 100vw"
          />
          <div className="absolute left-4 top-4 inline-flex rounded-full bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
            {t(`propertyTypeOptions.${offer.propertyType}`)}
          </div>
        </div>

        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="h-4 w-4 fill-accent text-accent" />
                  {offer.starRating.toFixed(0)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
                  {offer.guestRating.toFixed(1)} / 10
                </span>
                <span>{t("reviewsCount", {count: offer.reviewCount})}</span>
              </div>

              <div>
                <h2 className="font-display text-3xl tracking-[0.01em]">{offer.propertyName}</h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
                  {offer.neighborhood}, {offer.cityName}
                </p>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {offer.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {offer.featuredTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("stayLabel")}
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {formatHotelStayDates(offer.checkIn, offer.checkOut, locale)}
                </dd>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("amenitiesLabel")}
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {offer.amenities
                    .slice(0, 3)
                    .map((amenity) => t(`amenityOptions.${amenity}`))
                    .join(", ")}
                </dd>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("cancellationLabel")}
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {offer.displayRoom.refundable ? t("refundable") : t("nonRefundable")}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="flex flex-col justify-between rounded-lg border border-border/80 bg-secondary/40 p-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("leadRoomLabel")}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {offer.displayRoom.roomName}
                </p>
                <p className="text-sm text-muted-foreground">{offer.displayRoom.bedsSummary}</p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-2">
                  <Coffee aria-hidden="true" className="h-4 w-4 text-primary" />
                  {offer.displayRoom.breakfastIncluded
                    ? t("breakfastIncluded")
                    : t("breakfastExcluded")}
                </p>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                  {offer.displayRoom.cancellationSummary}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("fromLabel")}
                </p>
                <CurrencyAmount
                  amountMinor={offer.cheapestTotalAmount.amountMinor}
                  className="mt-2 block font-display text-4xl"
                  fromCurrency={offer.cheapestTotalAmount.currency}
                  locale={locale}
                />
                <p className="text-sm text-muted-foreground">{t("totalStayPrice")}</p>
              </div>

              <Button asChild className="w-full rounded-lg">
                <Link href={detailHref}>{t("detailCta")}</Link>
              </Button>
            </div>
          </aside>
        </CardContent>
      </div>
    </Card>
  );
}
