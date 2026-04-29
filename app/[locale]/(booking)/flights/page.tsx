import {Search} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {FlightResultsClient} from "@/features/flights/components/flight-results-client";
import {FlightSearchForm} from "@/features/flights/components/flight-search-form";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";

import {parseFlightSearchCriteria} from "@/features/flights/lib/schemas";

type FlightsPageProps = {
  params: {
    locale: Locale;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function hasSearchCriteria(searchParams: FlightsPageProps["searchParams"]) {
  return (
    typeof searchParams.origin === "string" &&
    typeof searchParams.destination === "string" &&
    typeof searchParams.departureDate === "string"
  );
}

function getInitialCriteria(
  locale: Locale,
  searchParams: FlightsPageProps["searchParams"]
) {
  if (!hasSearchCriteria(searchParams)) {
    return null;
  }

  try {
    return parseFlightSearchCriteria({
      ...searchParams,
      locale
    });
  } catch {
    return null;
  }
}

export default async function FlightsPage({
  params,
  searchParams
}: FlightsPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Flights"});
  const initialCriteria = getInitialCriteria(params.locale, searchParams);

  return (
    <main id="main-content" className="aurevia-section space-y-8">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          {t("resultsPage.eyebrow")}
        </p>
        <h1 className="font-display text-5xl tracking-[0.01em] text-foreground">
          {t("resultsPage.title")}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          {t("resultsPage.lead")}
        </p>
      </div>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Search aria-hidden="true" className="h-5 w-5" />
          </div>
          <CardTitle>{t("resultsPage.searchCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FlightSearchForm locale={params.locale} defaultValues={initialCriteria ?? undefined} />
        </CardContent>
      </Card>

      <FlightResultsClient initialCriteria={initialCriteria} locale={params.locale} />
    </main>
  );
}
