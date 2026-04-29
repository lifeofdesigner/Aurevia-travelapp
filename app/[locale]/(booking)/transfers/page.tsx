import {getTranslations} from "next-intl/server";

import {Card, CardContent} from "@/components/ui/card";
import {TransferResultsClient} from "@/features/transfers/components/transfer-results-client";
import {TransferSearchForm} from "@/features/transfers/components/transfer-search-form";
import {type TransferSearchCriteria} from "@/features/transfers/types";
import {type Locale} from "@/lib/i18n/routing";
import {DEFAULT_CURRENCY, isSupportedCurrency} from "@/lib/money";

type TransfersPageProps = {
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
    "airportCode",
    "dropoffLocation",
    "flightNumber",
    "luggageCount",
    "meetAndGreet",
    "passengerCount",
    "pickupDate",
    "pickupLocation",
    "pickupTime",
    "routeMode",
    "vehicleClass"
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
): Partial<TransferSearchCriteria> {
  const currency = getSearchValue(searchParams, "currency");

  return {
    airportCode: getSearchValue(searchParams, "airportCode") ?? undefined,
    currency:
      typeof currency === "string" && isSupportedCurrency(currency)
        ? currency
        : DEFAULT_CURRENCY,
    dropoffLocation: getSearchValue(searchParams, "dropoffLocation") ?? "",
    flightNumber: getSearchValue(searchParams, "flightNumber") ?? undefined,
    locale,
    luggageCount: Number(getSearchValue(searchParams, "luggageCount") ?? "1"),
    meetAndGreet: getSearchValue(searchParams, "meetAndGreet") === "1",
    passengerCount: Number(getSearchValue(searchParams, "passengerCount") ?? "2"),
    pickupDate: getSearchValue(searchParams, "pickupDate") ?? "",
    pickupLocation: getSearchValue(searchParams, "pickupLocation") ?? "",
    pickupTime: getSearchValue(searchParams, "pickupTime") ?? "",
    routeMode:
      (getSearchValue(searchParams, "routeMode") as TransferSearchCriteria["routeMode"]) ??
      "airport_to_hotel",
    vehicleClass:
      (getSearchValue(searchParams, "vehicleClass") as TransferSearchCriteria["vehicleClass"]) ??
      undefined
  };
}

export default async function TransfersPage({
  params,
  searchParams
}: TransfersPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Transfers.results"});
  const criteriaQuery = buildCriteriaQuery(searchParams, params.locale);
  const hasSearch = ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime"].every(
    (key) => {
      const value = getSearchValue(searchParams, key);
      return typeof value === "string" && value.length > 0;
    }
  );

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
          <TransferSearchForm
            defaultValues={getFormDefaults(searchParams, params.locale)}
            locale={params.locale}
            submitLabel={t("searchAction")}
          />
        </CardContent>
      </Card>

      <TransferResultsClient
        criteriaQuery={criteriaQuery.toString()}
        hasSearch={hasSearch}
        locale={params.locale}
      />
    </main>
  );
}
