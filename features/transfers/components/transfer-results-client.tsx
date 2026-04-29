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

import {getFilteredTransferOffers, parseTransferResultsFilters} from "../lib/results";
import {type TransferSearchResponse} from "../types";
import {TransferOfferCard} from "./transfer-offer-card";

type TransferResultsClientProps = {
  criteriaQuery: string;
  hasSearch: boolean;
  locale: string;
};

async function fetchTransferResults(criteriaQuery: string): Promise<TransferSearchResponse> {
  const response = await fetch(`/api/transfers/search?${criteriaQuery}`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as {message?: string} | TransferSearchResponse;

  if (!response.ok) {
    throw new Error(
      "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Unable to search transfers right now."
    );
  }

  return payload as TransferSearchResponse;
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

export function TransferResultsClient({
  criteriaQuery,
  hasSearch,
  locale
}: TransferResultsClientProps) {
  const t = useTranslations("Transfers.results");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseTransferResultsFilters(searchParams);
  const query = useQuery({
    enabled: hasSearch,
    queryFn: () => fetchTransferResults(criteriaQuery),
    queryKey: ["transfer-search", criteriaQuery]
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

    ["meetAndGreetOnly", "priceMax", "priceMin", "sort", "vehicleClasses"].forEach(
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

  const filteredOffers = getFilteredTransferOffers(query.data.offers, filters);
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
            <Label htmlFor="transfer-sort">{t("sortLabel")}</Label>
            <select
              id="transfer-sort"
              value={filters.sort}
              className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(event) => setSingleValue("sort", event.target.value)}
            >
              <option value="recommended">{t("sortOptions.recommended")}</option>
              <option value="price_asc">{t("sortOptions.price_asc")}</option>
              <option value="capacity_desc">{t("sortOptions.capacity_desc")}</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="transfer-price-min">{t("priceMinLabel")}</Label>
              <Input
                id="transfer-price-min"
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
              <Label htmlFor="transfer-price-max">{t("priceMaxLabel")}</Label>
              <Input
                id="transfer-price-max"
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
            <p className="text-sm font-semibold text-foreground">{t("vehicleClassesLabel")}</p>
            <div className="space-y-2">
              {query.data.metadata.vehicleClasses.map((vehicleClass) => (
                <label key={vehicleClass.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.vehicleClasses.includes(vehicleClass.key)}
                    onChange={() => toggleArrayValue("vehicleClasses", vehicleClass.key)}
                  />
                  <span>
                    {t(`vehicleClassOptions.${vehicleClass.key}`)} ({vehicleClass.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={filters.meetAndGreetOnly}
              onChange={(event) =>
                setSingleValue("meetAndGreetOnly", event.target.checked ? "1" : undefined)
              }
            />
            <span>{t("meetAndGreetOnlyLabel")}</span>
          </label>
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
              <TransferOfferCard
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
