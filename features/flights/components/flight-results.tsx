"use client";

import {Clock3, Loader2, ShieldCheck, Ticket} from "lucide-react";
import Image from "next/image";
import {useLocale} from "next-intl";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useMemo, useState} from "react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";

import {type FlightOffer} from "../lib/flight-types";

type FlightResultsProps = {
  error: string | null;
  loading: boolean;
  onRetry?: () => void;
  results: FlightOffer[] | null;
  searchId?: string | null;
};

type SortOption = "best" | "cheapest" | "fastest";

function getStopLabel(stops: number) {
  if (stops <= 0) {
    return "Direct";
  }

  if (stops === 1) {
    return "1 Stop";
  }

  return `${stops} Stops`;
}

function getSegmentDurationMinutes(offer: FlightOffer) {
  const departure = new Date(offer.outbound.departureTime).getTime();
  const arrival = new Date(offer.outbound.arrivalTime).getTime();

  if (Number.isNaN(departure) || Number.isNaN(arrival)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(Math.round((arrival - departure) / 60_000), 0);
}

function getBestScore(offer: FlightOffer) {
  return offer.price + offer.outbound.stops * 45_000 + getSegmentDurationMinutes(offer) * 350;
}

function formatCurrency(price: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(price);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function FlightResults({
  error,
  loading,
  onRetry,
  results,
  searchId
}: FlightResultsProps) {
  const locale = useLocale();
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>("cheapest");
  const sortedResults = useMemo(() => {
    if (!results) {
      return [];
    }

    const nextResults = [...results];

    nextResults.sort((left, right) => {
      if (sort === "cheapest") {
        return left.price - right.price;
      }

      if (sort === "fastest") {
        return getSegmentDurationMinutes(left) - getSegmentDurationMinutes(right);
      }

      return getBestScore(left) - getBestScore(right);
    });

    return nextResults;
  }, [results, sort]);

  const routeLabel =
    sortedResults.length > 0
      ? `${sortedResults[0].outbound.departureAirport.city} \u2192 ${sortedResults[0].outbound.arrivalAirport.city}`
      : null;

  function handleRetry() {
    if (onRetry) {
      onRetry();
      return;
    }

    router.refresh();
  }

  if (loading) {
    return (
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardContent className="flex min-h-[18rem] flex-col items-center justify-center gap-4 p-8 text-center">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Searching best fares...</p>
            <p className="text-sm text-muted-foreground">
              Comparing airlines, routes, and pricing for you.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle className="text-destructive">Flight search failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" className="rounded-lg px-6" onClick={handleRetry}>
            Retry search
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>No flights found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">
            Try changing your dates, route, or cabin class and search again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border/80 bg-card/88 p-5 shadow-soft">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Flight results
          </p>
          <h2 className="font-display text-3xl tracking-[0.01em] text-foreground">
            {sortedResults.length} flight{sortedResults.length === 1 ? "" : "s"} found
            {routeLabel ? ` · ${routeLabel}` : ""}
          </h2>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sort by
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {label: "Cheapest", value: "cheapest"},
              {label: "Fastest", value: "fastest"},
              {label: "Best", value: "best"}
            ].map((option) => {
              const isActive = sort === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background text-foreground hover:bg-muted"
                  )}
                  onClick={() => setSort(option.value as SortOption)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedResults.map((offer) => {
          const detailHref = `/${locale}/flights/${offer.id}${
            searchId ? `?searchLogId=${encodeURIComponent(searchId)}` : ""
          }`;

          return (
            <article
              key={offer.id}
              className="overflow-hidden rounded-lg border border-border/80 bg-card/92 shadow-soft"
            >
              <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:p-6">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    {offer.outbound.airline.logo ? (
                      <Image
                        src={offer.outbound.airline.logo}
                        alt={`${offer.outbound.airline.name} logo`}
                        className="h-11 w-11 rounded-full object-contain"
                        height={44}
                        unoptimized
                        width={44}
                      />
                    ) : (
                      <span className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg bg-secondary px-3 text-sm font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
                        {offer.outbound.airline.code}
                      </span>
                    )}

                    <div>
                      <p className="font-semibold text-foreground">{offer.outbound.airline.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Flight {offer.outbound.flightNumber}
                      </p>
                    </div>

                    <span className="rounded-full border border-border/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {getStopLabel(offer.outbound.stops)}
                    </span>

                    {offer.refundable ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        Refundable
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div>
                      <p className="text-3xl font-semibold text-foreground">
                        {formatTime(offer.outbound.departureTime)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {offer.outbound.departureAirport.code} · {offer.outbound.departureAirport.city}
                      </p>
                    </div>

                    <div className="space-y-2 text-center">
                      <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
                        {offer.outbound.duration}
                      </p>
                      <div className="h-px bg-border" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {getStopLabel(offer.outbound.stops)}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-3xl font-semibold text-foreground">
                        {formatTime(offer.outbound.arrivalTime)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {offer.outbound.arrivalAirport.code} · {offer.outbound.arrivalAirport.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Ticket aria-hidden="true" className="h-4 w-4 text-primary" />
                      {offer.baggage}
                    </span>
                  </div>

                  {typeof offer.seatsLeft === "number" && offer.seatsLeft < 5 ? (
                    <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                      Only {offer.seatsLeft} seat{offer.seatsLeft === 1 ? "" : "s"} left!
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-lg bg-background/80 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Best fare</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatCurrency(offer.price, offer.currency)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">per person</p>
                  </div>

                  <Button asChild className="rounded-lg px-5">
                    <Link href={detailHref}>Select flight</Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
