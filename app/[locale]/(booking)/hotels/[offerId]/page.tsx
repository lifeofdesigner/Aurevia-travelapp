import {MapPin, ShieldCheck, Star} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatHotelPrice, formatHotelStayDates} from "@/features/hotels/lib/formatters";
import {getCachedHotelOffer} from "@/server/hotels/offer-service";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type HotelDetailPageProps = {
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

export default async function HotelDetailPage({
  params,
  searchParams
}: HotelDetailPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Hotels.detail"});
  const hotelOffer = await getCachedHotelOffer(params.offerId);

  if (!hotelOffer) {
    notFound();
  }

  const {offer} = hotelOffer;
  const searchLogId = getSearchValue(searchParams, "searchLogId");

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={getLocalizedPath(ROUTES.hotels, params.locale)}
            className="text-sm font-semibold text-primary"
          >
            {t("backToResults")}
          </Link>
          <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">
            {offer.propertyName}
          </h1>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
            {offer.neighborhood}, {offer.cityName}, {offer.countryName}
          </p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/92 px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("leadPriceLabel")}
          </p>
          <p className="mt-2 font-display text-4xl">
            {formatHotelPrice({totalAmount: offer.cheapestTotalAmount}, params.locale)}
          </p>
          <p className="text-sm text-muted-foreground">{t("leadPriceBody")}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Image
            src={offer.images[0]}
            alt={offer.propertyName}
            width={1200}
            height={720}
            priority
            className="h-[20rem] w-full rounded-lg object-cover sm:col-span-2"
          />
          {offer.images.slice(1, 3).map((image, index) => (
            <Image
              key={image}
              src={image}
              alt={`${offer.propertyName} gallery ${index + 2}`}
              width={720}
              height={480}
              className="h-[12rem] w-full rounded-lg object-cover"
            />
          ))}
        </div>

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("snapshotTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden="true" className="h-4 w-4 fill-accent text-accent" />
                {offer.starRating}
              </span>
              <span>{offer.guestRating.toFixed(1)} / 10</span>
              <span>{t("reviewsCount", {count: offer.reviewCount})}</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("stayLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatHotelStayDates(offer.checkIn, offer.checkOut, params.locale)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("guestsLabel")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {offer.guestCount} · {offer.roomCount}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("addressLabel")}</dt>
                <dd className="text-right font-medium text-foreground">{offer.addressLine}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("overviewTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>{offer.description}</p>
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
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("amenitiesTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {offer.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm font-medium text-foreground"
                  >
                    {t(`amenityOptions.${amenity}`)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("policiesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("checkInPolicyLabel")}</p>
                <p>{offer.policies.checkIn}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("checkOutPolicyLabel")}</p>
                <p>{offer.policies.checkOut}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("cancellationPolicyLabel")}</p>
                <p>{offer.policies.cancellation}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("childrenPolicyLabel")}</p>
                <p>{offer.policies.children}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("roomOptionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offer.roomOptions.map((room) => {
                const bookingHref =
                  searchLogId && typeof searchLogId === "string"
                    ? `/${params.locale}/hotels/${room.offerId}/book?searchLogId=${searchLogId}`
                    : `/${params.locale}/hotels/${room.offerId}/book`;

                return (
                  <div
                    key={room.offerId}
                    className="rounded-lg border border-border/80 bg-background/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">{room.roomName}</h2>
                        <p className="text-sm text-muted-foreground">{room.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {room.bedsSummary} · {room.guestCapacity} {t("roomGuestCapacity")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl text-foreground">
                          {formatHotelPrice(room, params.locale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`rateTypeOptions.${room.rateType}`)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {room.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground"
                        >
                          {t(`amenityOptions.${amenity}`)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-border/80 bg-card/80 p-4 text-sm leading-7 text-muted-foreground">
                      <p className="inline-flex items-center gap-2 font-medium text-foreground">
                        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                        {room.refundable ? t("refundable") : t("nonRefundable")}
                      </p>
                      <p className="mt-2">{room.cancellationSummary}</p>
                      <p>{room.breakfastIncluded ? t("breakfastIncluded") : t("breakfastExcluded")}</p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button asChild className="rounded-lg px-6">
                        <Link href={bookingHref}>{t("selectRoomAction")}</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("mapTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-dashed border-border/80 bg-background/70 p-6 text-center text-sm leading-7 text-muted-foreground">
                {t("mapBody", {
                  latitude: offer.latitude.toFixed(3),
                  longitude: offer.longitude.toFixed(3)
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("reviewsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              {t("reviewsBody")}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
