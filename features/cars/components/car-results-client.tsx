"use client";

import {useQuery} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {ResultsFiltersLayout} from "@/components/shared/booking/results-filters-layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toMajorUnit, toMinorUnit} from "@/lib/money";

import {getFilteredCarOffers, parseCarResultsFilters} from "../lib/results";
import {type CarSearchResponse} from "../types";
import {CarOfferCard} from "./car-offer-card";

type CarResultsClientProps = {
  criteriaQuery: string;
  hasSearch: boolean;
  locale: string;
};

async function fetchCarResults(criteriaQuery: string): Promise<CarSearchResponse> {
  const response = await fetch(`/api/cars/search?${criteriaQuery}`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as {message?: string} | CarSearchResponse;

  if (!response.ok) {
    throw new Error(
      "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Unable to search cars right now."
    );
  }

  return payload as CarSearchResponse;
}

function parseStringArray(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function CarResultsClient({
  criteriaQuery,
  hasSearch,
  locale
}: CarResultsClientProps) {
  const t = useTranslations("Cars.results");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseCarResultsFilters(searchParams);
  const query = useQuery({
    enabled: hasSearch,
    queryFn: () => fetchCarResults(criteriaQuery),
    queryKey: ["car-search", criteriaQuery]
  });

  function replaceParams(nextParams: URLSearchParams) {
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }

  function setSingleValue(key: string, value?: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (!value) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    replaceParams(nextParams);
  }

  function toggleArrayValue(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const currentValues = new Set(parseStringArray(nextParams.get(key)));

    if (currentValues.has(value)) {
      currentValues.delete(value);
    } else {
      currentValues.add(value);
    }

    if (currentValues.size === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, Array.from(currentValues).join(","));
    }

    replaceParams(nextParams);
  }

  function clearFilters() {
    const nextParams = new URLSearchParams(searchParams.toString());

    ["categories", "fuelTypes", "priceMax", "priceMin", "seatsMin", "sort", "transmissions"].forEach(
      (key) => nextParams.delete(key)
    );

    replaceParams(nextParams);
  }

  if (!hasSearch) {
    return (
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>{t("emptySearchTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          {t("emptySearchBody")}
        </CardContent>
      </Card>
    );
  }

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("loadingTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            {t("loadingBody")}
          </CardContent>
        </Card>
        <div className="grid gap-6">
          {Array.from({length: 3}, (_, index) => (
            <div
              key={index}
              className="h-[18rem] animate-pulse rounded-lg border border-border/80 bg-card/70"
            />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>{t("errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            {query.error.message || t("errorBody")}
          </p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!query.data) {
    return null;
  }

  const filteredOffers = getFilteredCarOffers(query.data.offers, filters);
  const detailParams = new URLSearchParams(searchParams.toString());

  if (query.data.searchLogId) {
    detailParams.set("searchLogId", query.data.searchLogId);
  }

  return (
    <ResultsFiltersLayout
      clearLabel={t("clearFilters")}
      filtersContent={
        <>
          <div className="space-y-2">
            <Label htmlFor="car-sort">{t("sortLabel")}</Label>
            <select
              id="car-sort"
              value={filters.sort}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => setSingleValue("sort", event.target.value)}
            >
              <option value="recommended">{t("sortOptions.recommended")}</option>
              <option value="price_asc">{t("sortOptions.price_asc")}</option>
              <option value="seats_desc">{t("sortOptions.seats_desc")}</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="car-price-min">{t("priceMinLabel")}</Label>
              <Input
                id="car-price-min"
                type="number"
                defaultValue={
                  typeof filters.priceMin === "number"
                    ? toMajorUnit(filters.priceMin, query.data.criteria.currency)
                    : ""
                }
                onBlur={(event) =>
                  setSingleValue(
                    "priceMin",
                    event.target.value
                      ? String(
                          toMinorUnit(
                            Number(event.target.value),
                            query.data.criteria.currency
                          )
                        )
                      : undefined
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="car-price-max">{t("priceMaxLabel")}</Label>
              <Input
                id="car-price-max"
                type="number"
                defaultValue={
                  typeof filters.priceMax === "number"
                    ? toMajorUnit(filters.priceMax, query.data.criteria.currency)
                    : ""
                }
                onBlur={(event) =>
                  setSingleValue(
                    "priceMax",
                    event.target.value
                      ? String(
                          toMinorUnit(
                            Number(event.target.value),
                            query.data.criteria.currency
                          )
                        )
                      : undefined
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("categoriesLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.categories.map((category) => (
                <label key={category.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.key)}
                    onChange={() => toggleArrayValue("categories", category.key)}
                  />
                  <span>
                    {t(`categoryOptions.${category.key}`)} ({category.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("transmissionsLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.transmissions.map((transmission) => (
                <label key={transmission.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.transmissions.includes(transmission.key)}
                    onChange={() => toggleArrayValue("transmissions", transmission.key)}
                  />
                  <span>
                    {t(`transmissionOptions.${transmission.key}`)} ({transmission.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("fuelTypesLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.fuelTypes.map((fuelType) => (
                <label key={fuelType.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.fuelTypes.includes(fuelType.key)}
                    onChange={() => toggleArrayValue("fuelTypes", fuelType.key)}
                  />
                  <span>
                    {t(`fuelTypeOptions.${fuelType.key}`)} ({fuelType.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="car-seats-min">{t("seatsMinLabel")}</Label>
            <select
              id="car-seats-min"
              value={filters.seatsMin ? String(filters.seatsMin) : ""}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => setSingleValue("seatsMin", event.target.value || undefined)}
            >
              <option value="">{t("seatsMinOptions.any")}</option>
              {query.data.metadata.seatCounts.map((seatCount) => (
                <option key={seatCount} value={seatCount}>
                  {t("seatsMinOptions.atLeast", {count: seatCount})}
                </option>
              ))}
            </select>
          </div>
        </>
      }
      onClear={clearFilters}
      title={t("filtersTitle")}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border/80 bg-card/88 p-5 shadow-soft">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {t("resultsEyebrow")}
            </p>
            <h2 className="font-display text-3xl tracking-[0.01em]">{t("resultsTitle")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("resultsCount", {
              count: filteredOffers.length,
              total: query.data.offers.length
            })}
          </p>
        </div>

        {filteredOffers.length === 0 ? (
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("emptyResultsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              {t("emptyResultsBody")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredOffers.map((offer) => (
              <CarOfferCard
                key={offer.id}
                detailHref={`${pathname}/${offer.id}?${detailParams.toString()}`}
                locale={locale}
                offer={offer}
              />
            ))}
          </div>
        )}
      </div>
    </ResultsFiltersLayout>
  );
}
