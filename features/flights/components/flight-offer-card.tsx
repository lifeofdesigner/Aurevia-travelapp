"use client";

import {ArrowRight, BriefcaseBusiness, ShieldCheck, Ticket} from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {getAirlineLogoUrl} from "@/lib/flights/airline-branding";

import {formatFlightDate, formatFlightDuration, formatFlightTime} from "../lib/formatters";
import {type NormalizedFlightOffer} from "../types";

type FlightOfferCardProps = {
  href: string;
  locale: string;
  offer: NormalizedFlightOffer;
};

export function FlightOfferCard({href, locale, offer}: FlightOfferCardProps) {
  const t = useTranslations("Flights.results");
  const outboundLeg = offer.legs[0];
  const firstSegment = outboundLeg.segments[0];
  const finalSegment = outboundLeg.segments[outboundLeg.segments.length - 1];
  const airlineIdentities = offer.airlineCodes.map((code, index) => ({
    code,
    logoUrl: getAirlineLogoUrl(code, 64),
    name: offer.airlineNames[index] ?? code
  }));

  return (
    <article className="overflow-hidden rounded-lg border border-border/80 bg-card/92 shadow-soft">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {airlineIdentities.map((airline) => (
              <span
                key={airline.code}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {airline.logoUrl ? (
                  <Image
                    alt={`${airline.name} logo`}
                    className="h-7 w-7 rounded-full bg-white object-contain p-1"
                    height={28}
                    src={airline.logoUrl}
                    unoptimized
                    width={28}
                  />
                ) : (
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] text-secondary-foreground">
                    {airline.code}
                  </span>
                )}
                <span>{airline.name}</span>
              </span>
            ))}
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
              {t(`cabinBadges.${offer.cabinClass}`)}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div>
              <p className="text-3xl font-semibold text-foreground">
                {formatFlightTime(firstSegment.departureAt, locale, firstSegment.originTimeZone)}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {offer.originAirportCode} · {offer.originCityName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatFlightDate(firstSegment.departureAt, locale)}
              </p>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {formatFlightDuration(outboundLeg.durationMinutes)}
              </p>
              <div className="h-px bg-border" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {offer.stopCount === 0
                  ? t("stops.direct")
                  : t("stops.withCount", {count: offer.stopCount})}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-3xl font-semibold text-foreground">
                {formatFlightTime(finalSegment.arrivalAt, locale, finalSegment.destinationTimeZone)}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {offer.destinationAirportCode} · {offer.destinationCityName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatFlightDate(finalSegment.arrivalAt, locale)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
              {offer.refundable ? t("refundable") : t("nonRefundable")}
            </span>
            <span className="inline-flex items-center gap-2">
              <BriefcaseBusiness aria-hidden="true" className="h-4 w-4 text-primary" />
              {offer.baggageSummary.checked}
            </span>
            <span className="inline-flex items-center gap-2">
              <Ticket aria-hidden="true" className="h-4 w-4 text-primary" />
              {offer.fareConditions.changeSummary}
            </span>
          </div>
        </div>

        <div className="flex min-w-[12rem] flex-col justify-between gap-4 rounded-lg bg-background/80 p-5">
          <div>
            <p className="text-sm text-muted-foreground">{t("totalPriceLabel")}</p>
            <CurrencyAmount
              amountMinor={offer.totalAmount.amountMinor}
              className="mt-2 block text-3xl font-semibold text-foreground"
              fromCurrency={offer.totalAmount.currency}
              locale={locale}
            />
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {offer.baggageSummary.notes ?? t("baggagePlaceholder")}
            </p>
          </div>
          <Button asChild className="rounded-lg px-5">
            <Link href={href}>
              {t("reviewAction")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
