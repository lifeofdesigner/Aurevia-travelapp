import {getTranslations} from "next-intl/server";

import {Card, CardContent} from "@/components/ui/card";
import {CarResultsClient} from "@/features/cars/components/car-results-client";
import {CarSearchForm} from "@/features/cars/components/car-search-form";
import {type CarSearchCriteria} from "@/features/cars/types";
import {type Locale} from "@/lib/i18n/routing";
import {DEFAULT_CURRENCY, isSupportedCurrency} from "@/lib/money";

type CarsPageProps = {
  params: {
    locale: Locale;
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

function buildCriteriaQuery(
  searchParams: Record<string, string | string[] | undefined>,
  locale: Locale
) {
  const criteriaParams = new URLSearchParams();

  for (const key of [
    "driverAge",
    "dropoffDate",
    "dropoffLocation",
    "dropoffTime",
    "pickupDate",
    "pickupLocation",
    "pickupTime",
    "preferredCategory"
  ]) {
    const value = getSearchValue(searchParams, key);

    if (typeof value === "string" && value.length > 0) {
      criteriaParams.set(key, value);
    }
  }

  const currency = getSearchValue(searchParams, "currency");

  criteriaParams.set(
    "currency",
    typeof currency === "string" && isSupportedCurrency(currency)
      ? currency
      : DEFAULT_CURRENCY
  );
  criteriaParams.set("locale", locale);

  return criteriaParams;
}

function getFormDefaults(
  searchParams: Record<string, string | string[] | undefined>,
  locale: Locale
): Partial<CarSearchCriteria> {
  const currency = getSearchValue(searchParams, "currency");

  return {
    currency:
      typeof currency === "string" && isSupportedCurrency(currency)
        ? currency
        : DEFAULT_CURRENCY,
    driverAge: Number(getSearchValue(searchParams, "driverAge") ?? "30"),
    dropoffDate: getSearchValue(searchParams, "dropoffDate") ?? "",
    dropoffLocation: getSearchValue(searchParams, "dropoffLocation") ?? "",
    dropoffTime: getSearchValue(searchParams, "dropoffTime") ?? "",
    locale,
    pickupDate: getSearchValue(searchParams, "pickupDate") ?? "",
    pickupLocation: getSearchValue(searchParams, "pickupLocation") ?? "",
    pickupTime: getSearchValue(searchParams, "pickupTime") ?? "",
    preferredCategory:
      (getSearchValue(searchParams, "preferredCategory") as CarSearchCriteria["preferredCategory"]) ??
      undefined
  };
}

export default async function CarsPage({params, searchParams}: CarsPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Cars.results"});
  const criteriaQuery = buildCriteriaQuery(searchParams, params.locale);
  const hasSearch = [
    "pickupLocation",
    "dropoffLocation",
    "pickupDate",
    "pickupTime",
    "dropoffDate",
    "dropoffTime"
  ].every((key) => {
    const value = getSearchValue(searchParams, key);
    return typeof value === "string" && value.length > 0;
  });

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <section className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          {t("heroEyebrow")}
        </p>
        <div className="space-y-4">
          <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            {t("heroBody")}
          </p>
        </div>
      </section>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardContent className="p-6 sm:p-8">
          <CarSearchForm
            defaultValues={getFormDefaults(searchParams, params.locale)}
            locale={params.locale}
            submitLabel={t("searchAction")}
          />
        </CardContent>
      </Card>

      <CarResultsClient
        criteriaQuery={criteriaQuery.toString()}
        hasSearch={hasSearch}
        locale={params.locale}
      />
    </main>
  );
}
