import {getTranslations} from "next-intl/server";

import {Card, CardContent} from "@/components/ui/card";
import {HotelResultsClient} from "@/features/hotels/components/hotel-results-client";
import {HotelSearchForm} from "@/features/hotels/components/hotel-search-form";
import {type HotelSearchCriteria} from "@/features/hotels/types";
import {DEFAULT_CURRENCY, isSupportedCurrency} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";

type HotelsPageProps = {
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
    "checkIn",
    "checkOut",
    "destination",
    "guests",
    "preferredStarRating",
    "propertyType",
    "rooms"
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
): Partial<HotelSearchCriteria> {
  const currency = getSearchValue(searchParams, "currency");
  const preferredStarRating = getSearchValue(searchParams, "preferredStarRating");

  return {
    checkIn: getSearchValue(searchParams, "checkIn") ?? "",
    checkOut: getSearchValue(searchParams, "checkOut") ?? "",
    currency:
      typeof currency === "string" && isSupportedCurrency(currency)
        ? currency
        : DEFAULT_CURRENCY,
    destination: getSearchValue(searchParams, "destination") ?? "",
    guests: Number(getSearchValue(searchParams, "guests") ?? "2"),
    locale,
    preferredStarRating: preferredStarRating ? Number(preferredStarRating) : undefined,
    propertyType:
      (getSearchValue(searchParams, "propertyType") as HotelSearchCriteria["propertyType"]) ??
      undefined,
    rooms: Number(getSearchValue(searchParams, "rooms") ?? "1")
  };
}

export default async function HotelsPage({params, searchParams}: HotelsPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Hotels.results"});
  const criteriaQuery = buildCriteriaQuery(searchParams, params.locale);
  const hasSearch = ["destination", "checkIn", "checkOut"].every((key) => {
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
          <HotelSearchForm
            defaultValues={getFormDefaults(searchParams, params.locale)}
            locale={params.locale}
            submitLabel={t("searchAction")}
          />
        </CardContent>
      </Card>

      <HotelResultsClient
        criteriaQuery={criteriaQuery.toString()}
        hasSearch={hasSearch}
        locale={params.locale}
      />
    </main>
  );
}
