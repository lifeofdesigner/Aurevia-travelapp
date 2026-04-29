"use client";

import {useQuery} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {ResultsFiltersLayout} from "@/components/shared/booking/results-filters-layout";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatMoney} from "@/lib/money";

import {parseFlightResultsFilters} from "../lib/schemas";
import {applyFlightResultsFilters, sortFlightOffers} from "../lib/results";
import {type FlightSearchCriteria, type FlightSearchResponse} from "../types";
import {FlightOfferCard} from "./flight-offer-card";

type FlightResultsClientProps = {
  initialCriteria: FlightSearchCriteria | null;
  locale: string;
};

async function fetchFlightResults(criteria: FlightSearchCriteria) {
  const params = new URLSearchParams({
    adults: String(criteria.adults),
    cabinClass: criteria.cabinClass,
    children: String(criteria.children),
    currency: criteria.currency,
    departureDate: criteria.departureDate,
    destination: criteria.destination,
    infants: String(criteria.infants),
    locale: criteria.locale,
    origin: criteria.origin,
    tripType: criteria.tripType
  });

  if (criteria.returnDate) {
    params.set("returnDate", criteria.returnDate);
  }

  if (criteria.tripType === "multi_city" && criteria.multiCitySegments?.length) {
    params.set(
      "segments",
      criteria.multiCitySegments
        .map((segment) =>
          [segment.origin, segment.destination, segment.departureDate].join(":")
        )
        .join("|")
    );
  }

  const response = await fetch(`/api/flights/search?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {message?: string}
      | null;

    throw new Error(payload?.message ?? "Unable to load flight offers.");
  }

  return (await response.json()) as FlightSearchResponse;
}

export function FlightResultsClient({
  initialCriteria,
  locale
}: FlightResultsClientProps) {
  const t = useTranslations("Flights.results");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFlightResultsFilters(searchParams);
  const query = useQuery({
    enabled: Boolean(initialCriteria),
    queryFn: () => fetchFlightResults(initialCriteria as FlightSearchCriteria),
    queryKey: ["flight-search", initialCriteria]
  });

  function updateSearchParams(
    updates: Record<string, string | null>,
    options?: {deleteKeys?: string[]}
  ) {
    const nextParams = new URLSearchParams(searchParams.toString());

    options?.deleteKeys?.forEach((key) => nextParams.delete(key));

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, value);
    });

    router.replace(`${pathname}?${nextParams.toString()}`, {scroll: false});
  }

  function toggleListFilter(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const currentValues = (nextParams.get(key) ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((entry) => entry !== value)
      : [...currentValues, value];

    if (nextValues.length === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValues.join(","));
    }

    router.replace(`${pathname}?${nextParams.toString()}`, {scroll: false});
  }

  function clearFilters() {
    updateSearchParams(
      {},
      {
        deleteKeys: [
          "sort",
          "airlines",
          "stops",
          "departureWindow",
          "arrivalWindow",
          "cabin",
          "priceMin",
          "priceMax",
          "refundable",
          "baggageIncluded"
        ]
      }
    );
  }

  if (!initialCriteria) {
    return (
      <Card className="border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle>{t("introTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">{t("introBody")}</p>
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({length: 3}, (_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-lg border border-border/80 bg-card/80"
          />
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <Card className="border-destructive/25 bg-card/92">
        <CardHeader>
          <CardTitle>{t("errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">
            {query.error instanceof Error ? query.error.message : t("errorBody")}
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-primary"
            onClick={() => query.refetch()}
          >
            {t("retryAction")}
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!query.data) {
    return (
      <Card className="border-border/80 bg-card/92">
        <CardHeader>
          <CardTitle>{t("emptyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">{t("emptyBody")}</p>
        </CardContent>
      </Card>
    );
  }

  const response = query.data;
  const filteredOffers = sortFlightOffers(
    applyFlightResultsFilters(response.offers, filters),
    filters.sort
  );

  return (
    <ResultsFiltersLayout
      clearLabel={t("clearFiltersAction")}
      filtersContent={
        <>
          <div className="space-y-2">
            <label htmlFor="sort" className="text-sm font-semibold text-foreground">
              {t("sortLabel")}
            </label>
            <select
              id="sort"
              value={filters.sort}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => updateSearchParams({sort: event.target.value})}
            >
              <option value="best">{t("sortOptions.best")}</option>
              <option value="price_asc">{t("sortOptions.price_asc")}</option>
              <option value="duration_asc">{t("sortOptions.duration_asc")}</option>
              <option value="departure_asc">{t("sortOptions.departure_asc")}</option>
              <option value="arrival_asc">{t("sortOptions.arrival_asc")}</option>
            </select>
          </div>

          {response.metadata.airlines.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{t("airlineFilterLabel")}</p>
              <div className="space-y-2">
                {response.metadata.airlines.map((airline) => (
                  <label key={airline.code} className="flex items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={filters.airlines.includes(airline.code)}
                      onChange={() => toggleListFilter("airlines", airline.code)}
                    />
                    <span>
                      {airline.name} ({airline.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("stopsFilterLabel")}</p>
            <div className="space-y-2">
              {[0, 1, 2].map((stops) => (
                <label key={stops} className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={filters.stops.includes(stops)}
                    onChange={() => toggleListFilter("stops", String(stops))}
                  />
                  <span>
                    {stops === 0 ? t("stops.direct") : t("stops.withCount", {count: stops})}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("departureWindowLabel")}</p>
            <div className="space-y-2">
              {["overnight", "morning", "afternoon", "evening"].map((windowKey) => (
                <label key={windowKey} className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={filters.departureWindows.includes(windowKey as typeof filters.departureWindows[number])}
                    onChange={() => toggleListFilter("departureWindow", windowKey)}
                  />
                  <span>{t(`timeWindows.${windowKey}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("arrivalWindowLabel")}</p>
            <div className="space-y-2">
              {["overnight", "morning", "afternoon", "evening"].map((windowKey) => (
                <label key={windowKey} className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={filters.arrivalWindows.includes(windowKey as typeof filters.arrivalWindows[number])}
                    onChange={() => toggleListFilter("arrivalWindow", windowKey)}
                  />
                  <span>{t(`timeWindows.${windowKey}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("cabinFilterLabel")}</p>
            <div className="space-y-2">
              {response.metadata.cabins.map((cabin) => (
                <label key={cabin} className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={filters.cabins.includes(cabin)}
                    onChange={() => toggleListFilter("cabin", cabin)}
                  />
                  <span>{t(`cabinBadges.${cabin}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              updateSearchParams({
                priceMax: formData.get("priceMax")?.toString() || null,
                priceMin: formData.get("priceMin")?.toString() || null
              });
            }}
          >
            <p className="text-sm font-semibold text-foreground">{t("priceFilterLabel")}</p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(
                {
                  amountMinor: response.metadata.minPriceMinor,
                  currency: response.criteria.currency
                },
                locale
              )}{" "}
              -{" "}
              {formatMoney(
                {
                  amountMinor: response.metadata.maxPriceMinor,
                  currency: response.criteria.currency
                },
                locale
              )}
            </p>
            <div className="grid gap-3">
              <input
                name="priceMin"
                type="number"
                min={0}
                defaultValue={filters.priceMin}
                className="h-11 rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t("priceMinPlaceholder")}
              />
              <input
                name="priceMax"
                type="number"
                min={0}
                defaultValue={filters.priceMax}
                className="h-11 rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t("priceMaxPlaceholder")}
              />
              <button type="submit" className="text-left text-sm font-semibold text-primary">
                {t("applyPriceAction")}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.refundable}
                onChange={(event) =>
                  updateSearchParams({
                    refundable: event.target.checked ? "true" : null
                  })
                }
              />
              <span>{t("refundableOnlyLabel")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.baggageIncluded}
                onChange={(event) =>
                  updateSearchParams({
                    baggageIncluded: event.target.checked ? "true" : null
                  })
                }
              />
              <span>{t("baggageIncludedOnlyLabel")}</span>
            </label>
          </div>
        </>
      }
      onClear={clearFilters}
      title={t("filtersTitle")}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {t("resultsLabel")}
            </p>
            <h2 className="font-display text-3xl text-foreground">
              {filteredOffers.length === 1
                ? t("resultsCount.one")
                : t("resultsCount.other", {count: filteredOffers.length})}
            </h2>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            {t("currencyNote", {currency: response.criteria.currency})}
          </p>
        </div>

        {response.offers.length === 0 ? (
          <Card className="border-border/80 bg-card/90">
            <CardHeader>
              <CardTitle>{t("emptyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7 text-muted-foreground">{t("emptyBody")}</p>
            </CardContent>
          </Card>
        ) : null}

        {response.offers.length > 0 && filteredOffers.length === 0 ? (
          <Card className="border-border/80 bg-card/90">
            <CardHeader>
              <CardTitle>{t("filteredEmptyTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-7 text-muted-foreground">{t("filteredEmptyBody")}</p>
              <button
                type="button"
                className="text-sm font-semibold text-primary"
                onClick={clearFilters}
              >
                {t("clearFiltersAction")}
              </button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {filteredOffers.map((offer) => (
            <FlightOfferCard
              key={offer.id}
              href={`/${locale}/flights/${offer.id}?searchLogId=${response.searchLogId}`}
              locale={locale}
              offer={offer}
            />
          ))}
        </div>
      </div>
    </ResultsFiltersLayout>
  );
}
