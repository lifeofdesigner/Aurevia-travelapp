import {ArrowRight, BriefcaseBusiness, ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatFlightDate, formatFlightDateTime, formatFlightDuration} from "@/features/flights/lib/formatters";
import {getCachedFlightOffer} from "@/server/flights/offer-service";
import {formatMoney} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";

type FlightOfferDetailsPageProps = {
  params: {
    locale: Locale;
    offerId: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function FlightOfferDetailsPage({
  params,
  searchParams
}: FlightOfferDetailsPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Flights"});
  const cachedOffer = await getCachedFlightOffer(params.offerId);
  const searchLogId =
    typeof searchParams.searchLogId === "string" ? searchParams.searchLogId : undefined;

  if (!cachedOffer) {
    return (
      <main id="main-content" className="aurevia-section">
        <Card className="border-border/80 bg-card/92">
          <CardHeader>
            <CardTitle>{t("detailsPage.notFoundTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{t("detailsPage.notFoundBody")}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const {offer} = cachedOffer;

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          {t("detailsPage.eyebrow")}
        </p>
        <h1 className="font-display text-5xl text-foreground">
          {offer.originAirportCode} to {offer.destinationAirportCode}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          {t("detailsPage.lead")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          <Card className="border-border/80 bg-card/92">
            <CardHeader>
              <CardTitle>{t("detailsPage.itineraryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {offer.legs.map((leg, legIndex) => {
                const firstSegment = leg.segments[0];
                const finalSegment = leg.segments[leg.segments.length - 1];

                return (
                  <div key={legIndex} className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {leg.originAirportCode} to {leg.destinationAirportCode}
                        </p>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {formatFlightDate(firstSegment.departureAt, params.locale)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {formatFlightDuration(leg.durationMinutes)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {leg.segments.map((segment) => (
                        <div key={segment.segmentId} className="rounded-lg border border-border/80 bg-card/88 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-foreground">
                              {segment.marketingAirlineName} {segment.flightNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatFlightDuration(segment.durationMinutes)}
                            </p>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                            <div>
                              <p className="text-lg font-semibold text-foreground">
                                {segment.originAirportCode}
                              </p>
                              <p className="text-sm leading-7 text-muted-foreground">
                                {formatFlightDateTime(
                                  segment.departureAt,
                                  params.locale,
                                  segment.originTimeZone
                                )}
                              </p>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {segment.fareClassCode ?? t("detailsPage.cabinFallback")}
                            </p>
                            <div className="md:text-right">
                              <p className="text-lg font-semibold text-foreground">
                                {segment.destinationAirportCode}
                              </p>
                              <p className="text-sm leading-7 text-muted-foreground">
                                {formatFlightDateTime(
                                  segment.arrivalAt,
                                  params.locale,
                                  segment.destinationTimeZone
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {legIndex === 0 ? t("detailsPage.outboundLabel") : t("detailsPage.returnLabel")}
                      : {firstSegment.originCityName} to {finalSegment.destinationCityName}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92">
            <CardHeader>
              <CardTitle>{t("detailsPage.fareConditionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                  {offer.refundable ? t("booking.refundable") : t("booking.nonRefundable")}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {offer.fareConditions.cancellationSummary}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <BriefcaseBusiness aria-hidden="true" className="h-4 w-4 text-primary" />
                  {t("detailsPage.baggageTitle")}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {offer.baggageSummary.checked}
                  <br />
                  {offer.baggageSummary.notes}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="border-border/80 bg-card/92">
            <CardHeader>
              <CardTitle>{t("detailsPage.summaryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("detailsPage.airlinesLabel")}</p>
                <p className="font-semibold text-foreground">{offer.airlineNames.join(", ")}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("detailsPage.travelersLabel")}</p>
                <p className="font-semibold text-foreground">
                  {offer.passengerCounts.adults} {t("detailsPage.adultsLabel")}
                  {offer.passengerCounts.children > 0
                    ? ` · ${offer.passengerCounts.children} ${t("detailsPage.childrenLabel")}`
                    : ""}
                  {offer.passengerCounts.infants > 0
                    ? ` · ${offer.passengerCounts.infants} ${t("detailsPage.infantsLabel")}`
                    : ""}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("detailsPage.totalLabel")}</p>
                <p className="text-3xl font-semibold text-foreground">
                  {formatMoney(offer.totalAmount, params.locale)}
                </p>
              </div>
              <Button asChild className="w-full rounded-lg">
                <Link
                  href={`/${params.locale}/flights/${params.offerId}/book${searchLogId ? `?searchLogId=${searchLogId}` : ""}`}
                >
                  {t("detailsPage.continueAction")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
