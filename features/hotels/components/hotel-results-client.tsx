"use client";

import {useQuery} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {ResultsFiltersLayout} from "@/components/shared/booking/results-filters-layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {type Locale} from "@/lib/i18n/routing";
import {toMajorUnit, toMinorUnit} from "@/lib/money";
import {cn} from "@/lib/utils";

import {getFilteredHotelOffers, parseHotelResultsFilters} from "../lib/results";
import {type HotelSearchResponse} from "../types";
import {HotelOfferCard} from "./hotel-offer-card";

type HotelResultsClientProps = {
  criteriaQuery: string;
  hasSearch: boolean;
  locale: Locale;
};

async function fetchHotelResults(criteriaQuery: string): Promise<HotelSearchResponse> {
  const response = await fetch(`/api/hotels/search?${criteriaQuery}`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as {message?: string} | HotelSearchResponse;

  if (!response.ok) {
    throw new Error(
      "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Unable to search stays right now."
    );
  }

  return payload as HotelSearchResponse;
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

export function HotelResultsClient({
  criteriaQuery,
  hasSearch,
  locale
}: HotelResultsClientProps) {
  const t = useTranslations("Hotels.results");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseHotelResultsFilters(searchParams);
  const query = useQuery({
    enabled: hasSearch,
    queryFn: () => fetchHotelResults(criteriaQuery),
    queryKey: ["hotel-search", criteriaQuery]
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

    [
      "amenities",
      "breakfastIncluded",
      "neighborhoods",
      "priceMax",
      "priceMin",
      "refundable",
      "sort",
      "stars",
      "view"
    ].forEach((key) => nextParams.delete(key));

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
              className="h-[22rem] animate-pulse rounded-lg border border-border/80 bg-card/70"
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

  const filteredOffers = getFilteredHotelOffers(query.data.offers, filters);
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
            <Label htmlFor="hotel-sort">{t("sortLabel")}</Label>
            <select
              id="hotel-sort"
              value={filters.sort}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => setSingleValue("sort", event.target.value)}
            >
              <option value="recommended">{t("sortOptions.recommended")}</option>
              <option value="price_asc">{t("sortOptions.price_asc")}</option>
              <option value="rating_desc">{t("sortOptions.rating_desc")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("viewLabel")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label: t("viewOptions.grid"), value: "grid"},
                {label: t("viewOptions.list"), value: "list"}
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
                    filters.view === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background text-foreground hover:bg-muted"
                  )}
                  onClick={() => setSingleValue("view", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="hotel-price-min">{t("priceMinLabel")}</Label>
              <Input
                id="hotel-price-min"
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
              <Label htmlFor="hotel-price-max">{t("priceMaxLabel")}</Label>
              <Input
                id="hotel-price-max"
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
            <p className="text-sm font-semibold text-foreground">{t("starRatingsLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.starRatings.map((starRating) => (
                <label key={starRating} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.stars.includes(starRating)}
                    onChange={() => toggleArrayValue("stars", String(starRating))}
                  />
                  <span>{t("starFilterLabel", {count: starRating})}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{t("amenitiesFilterLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.amenities.map((amenity) => (
                <label key={amenity.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.amenities.includes(amenity.key)}
                    onChange={() => toggleArrayValue("amenities", amenity.key)}
                  />
                  <span>
                    {t(`amenityOptions.${amenity.key}`)} ({amenity.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t("neighborhoodFilterLabel")}
            </p>
            <div className="space-y-2">
              {query.data.metadata.neighborhoods.map((neighborhood) => (
                <label key={neighborhood.name} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.neighborhoods.includes(neighborhood.name)}
                    onChange={() => toggleArrayValue("neighborhoods", neighborhood.name)}
                  />
                  <span>
                    {neighborhood.name} ({neighborhood.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.refundable}
                onChange={(event) =>
                  setSingleValue("refundable", event.target.checked ? "1" : undefined)
                }
              />
              <span>{t("refundableOnlyLabel")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.breakfastIncluded}
                onChange={(event) =>
                  setSingleValue(
                    "breakfastIncluded",
                    event.target.checked ? "1" : undefined
                  )
                }
              />
              <span>{t("breakfastOnlyLabel")}</span>
            </label>
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
            <h2 className="font-display text-3xl tracking-[0.01em]">
              {t("resultsTitle")}
            </h2>
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
          <div
            className={cn(
              "grid gap-6",
              filters.view === "grid" && "xl:grid-cols-2"
            )}
          >
            {filteredOffers.map((offer) => (
              <HotelOfferCard
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
