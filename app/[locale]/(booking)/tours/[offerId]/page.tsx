import {CalendarDays, Clock3, MapPin, ShieldCheck, Star, Users} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  formatTourDateTime,
  formatTourDuration,
  formatTourPrice,
  getTourSlotLabel
} from "@/features/tours/lib/formatters";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getCachedTourOffer} from "@/server/tours/offer-service";

type TourDetailPageProps = {
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

export default async function TourDetailPage({
  params,
  searchParams
}: TourDetailPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Tours.detail"});
  const cachedTour = await getCachedTourOffer(params.offerId);

  if (!cachedTour) {
    notFound();
  }

  const {offer, relatedActivities} = cachedTour;
  const searchLogId = getSearchValue(searchParams, "searchLogId");

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={getLocalizedPath(ROUTES.tours, params.locale)}
            className="text-sm font-semibold text-primary"
          >
            {t("backToResults")}
          </Link>
          <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">{offer.title}</h1>
          <p className="text-sm text-muted-foreground">
            {offer.cityName}, {offer.countryName}
          </p>
        </div>

        <div className="rounded-lg border border-border/80 bg-card/92 px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("leadPriceLabel")}
          </p>
          <p className="mt-2 font-display text-4xl">{formatTourPrice(offer, params.locale)}</p>
          <p className="text-sm text-muted-foreground">{t("leadPriceBody")}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            aria-hidden="true"
            className="h-[20rem] rounded-lg bg-cover bg-center sm:col-span-2"
            style={{backgroundImage: `url(${offer.images[0]})`}}
          />
          {offer.images.slice(1, 3).map((image, index) => (
            <div
              key={image}
              aria-hidden="true"
              className="h-[12rem] rounded-lg bg-cover bg-center"
              style={{backgroundImage: `url(${image})`}}
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
                {offer.reviewRating.toFixed(1)}
              </span>
              <span>{t("reviewsCount", {count: offer.reviewCount})}</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("dateLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">{offer.serviceDate}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("durationLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatTourDuration(offer.durationMinutes)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("meetingPointLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">{offer.meetingPoint}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("experienceStyleLabel")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {offer.privateAvailable ? t("privateAvailable") : t("sharedExperience")}
                </dd>
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
              <p>{offer.overview}</p>
              <p>{offer.description}</p>
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
              <CardTitle>{t("inclusionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 text-sm leading-7 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="font-medium text-foreground">{t("includedLabel")}</p>
                <ul className="space-y-2 text-muted-foreground">
                  {offer.inclusions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="font-medium text-foreground">{t("excludedLabel")}</p>
                <ul className="space-y-2 text-muted-foreground">
                  {offer.exclusions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("policiesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("cancellationPolicyLabel")}</p>
                <p>{offer.cancellationPolicy}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("meetingInstructionsLabel")}</p>
                <p>{offer.meetingInstructions}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">{t("ticketDeliveryLabel")}</p>
                <p>{offer.ticketDeliveryMethod}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("faqTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offer.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm"
                >
                  <p className="font-medium text-foreground">{faq.question}</p>
                  <p className="mt-2 leading-7 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("availabilityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">{t("availabilityBody")}</p>
              {offer.availabilitySlots.map((slot) => {
                const bookingParams = new URLSearchParams();

                bookingParams.set("slotId", slot.slotId);

                if (typeof searchLogId === "string" && searchLogId.length > 0) {
                  bookingParams.set("searchLogId", searchLogId);
                }

                const bookingHref = `/${params.locale}/tours/${offer.id}/book?${bookingParams.toString()}`;

                return (
                  <div
                    key={slot.slotId}
                    className="rounded-lg border border-border/80 bg-background/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">{slot.label}</h2>
                        <p className="text-sm text-muted-foreground">
                          {formatTourDateTime(slot.startsAt, params.locale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("slotCapacity", {count: slot.remainingCapacity})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatTourDuration(offer.durationMinutes)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {slot.soldOut ? t("soldOut") : t("availableNow")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      {slot.soldOut ? (
                        <Button type="button" variant="outline" className="rounded-lg px-6" disabled>
                          {t("soldOut")}
                        </Button>
                      ) : (
                        <Button asChild className="rounded-lg px-6">
                          <Link href={bookingHref}>{t("selectSlotAction")}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("reviewsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <Star aria-hidden="true" className="h-4 w-4 fill-accent text-accent" />
                {offer.reviewRating.toFixed(1)} | {t("reviewsCount", {count: offer.reviewCount})}
              </p>
              <p>{t("reviewsBody")}</p>
            </CardContent>
          </Card>

          {relatedActivities.length > 0 ? (
            <Card className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <CardTitle>{t("relatedTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {relatedActivities.map((activity) => {
                  const detailHref =
                    typeof searchLogId === "string" && searchLogId.length > 0
                      ? `/${params.locale}/tours/${activity.id}?searchLogId=${searchLogId}`
                      : `/${params.locale}/tours/${activity.id}`;

                  return (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          {t(`categoryOptions.${activity.category}`)}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTourDuration(activity.durationMinutes)} |{" "}
                          {formatTourPrice(activity, params.locale)}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button asChild variant="outline" className="rounded-lg px-6">
                          <Link href={detailHref}>{t("relatedAction")}</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
