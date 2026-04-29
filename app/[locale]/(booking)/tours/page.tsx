import {getTranslations} from "next-intl/server";

import {Card, CardContent} from "@/components/ui/card";
import {TourResultsClient} from "@/features/tours/components/tour-results-client";
import {TourSearchForm} from "@/features/tours/components/tour-search-form";
import {type TourSearchCriteria} from "@/features/tours/types";
import {type Locale} from "@/lib/i18n/routing";
import {DEFAULT_CURRENCY, isSupportedCurrency} from "@/lib/money";

type ToursPageProps = {
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

  for (const key of ["destination", "serviceDate", "category", "duration"]) {
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
  searchParams: Record<string, string | string[] | undefined>
): Partial<TourSearchCriteria> {
  return {
    category:
      (getSearchValue(searchParams, "category") as TourSearchCriteria["category"]) ?? undefined,
    destination: getSearchValue(searchParams, "destination") ?? "",
    duration:
      (getSearchValue(searchParams, "duration") as TourSearchCriteria["duration"]) ?? undefined,
    serviceDate: getSearchValue(searchParams, "serviceDate") ?? ""
  };
}

export default async function ToursPage({params, searchParams}: ToursPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Tours.results"});
  const criteriaQuery = buildCriteriaQuery(searchParams, params.locale);
  const hasSearch = ["destination", "serviceDate"].every((key) => {
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
          <TourSearchForm
            defaultValues={getFormDefaults(searchParams)}
            locale={params.locale}
            submitLabel={t("searchAction")}
          />
        </CardContent>
      </Card>

      <TourResultsClient
        criteriaQuery={criteriaQuery.toString()}
        hasSearch={hasSearch}
        locale={params.locale}
      />
    </main>
  );
}
