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

import {getFilteredTourOffers, parseTourResultsFilters} from "../lib/results";
import {type TourSearchResponse} from "../types";
import {TourOfferCard} from "./tour-offer-card";

type TourResultsClientProps = {
  criteriaQuery: string;
  hasSearch: boolean;
  locale: Locale;
};

async function fetchTourResults(criteriaQuery: string): Promise<TourSearchResponse> {
  const response = await fetch(`/api/tours/search?${criteriaQuery}`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as {message?: string} | TourSearchResponse;

  if (!response.ok) {
    throw new Error(
      "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Unable to search activities right now."
    );
  }

  return payload as TourSearchResponse;
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

export function TourResultsClient({
  criteriaQuery,
  hasSearch,
  locale
}: TourResultsClientProps) {
  const t = useTranslations("Tours.results");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseTourResultsFilters(searchParams);
  const query = useQuery({
    enabled: hasSearch,
    queryFn: () => fetchTourResults(criteriaQuery),
    queryKey: ["tour-search", criteriaQuery]
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
      "categories",
      "durationOptions",
      "familyFriendly",
      "groupFriendly",
      "priceMax",
      "priceMin",
      "privateAvailable",
      "sort"
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

  const filteredOffers = getFilteredTourOffers(query.data.offers, filters);
  const detailParams = new URLSearchParams(searchParams.toString());

  if (query.data.searchLogId) {
    detailParams.set("searchLogId", query.data.searchLogId);
  }

  const detailQueryString = detailParams.toString();

  return (
    <ResultsFiltersLayout
      clearLabel={t("clearFilters")}
      filtersContent={
        <>
          <div className="space-y-2">
            <Label htmlFor="tour-sort">{t("sortLabel")}</Label>
            <select
              id="tour-sort"
              value={filters.sort}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => setSingleValue("sort", event.target.value)}
            >
              <option value="recommended">{t("sortOptions.recommended")}</option>
              <option value="price_asc">{t("sortOptions.price_asc")}</option>
              <option value="rating_desc">{t("sortOptions.rating_desc")}</option>
              <option value="duration_asc">{t("sortOptions.duration_asc")}</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="tour-price-min">{t("priceMinLabel")}</Label>
              <Input
                id="tour-price-min"
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
              <Label htmlFor="tour-price-max">{t("priceMaxLabel")}</Label>
              <Input
                id="tour-price-max"
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
            <p className="text-sm font-semibold text-foreground">{t("durationsLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.durationOptions.map((duration) => (
                <label key={duration.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.durationOptions.includes(duration.key)}
                    onChange={() => toggleArrayValue("durationOptions", duration.key)}
                  />
                  <span>
                    {t(`durationOptions.${duration.key}`)} ({duration.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.familyFriendly}
                onChange={(event) =>
                  setSingleValue("familyFriendly", event.target.checked ? "1" : undefined)
                }
              />
              <span>{t("familyFriendlyOnlyLabel")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.privateAvailable}
                onChange={(event) =>
                  setSingleValue("privateAvailable", event.target.checked ? "1" : undefined)
                }
              />
              <span>{t("privateOnlyLabel")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.groupFriendly}
                onChange={(event) =>
                  setSingleValue("groupFriendly", event.target.checked ? "1" : undefined)
                }
              />
              <span>{t("groupFriendlyOnlyLabel")}</span>
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
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredOffers.map((offer) => (
              <TourOfferCard
                key={offer.id}
                detailHref={
                  detailQueryString
                    ? `${pathname}/${offer.id}?${detailQueryString}`
                    : `${pathname}/${offer.id}`
                }
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
