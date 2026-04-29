"use client";

import dynamic from "next/dynamic";
import {
  Building2,
  Car,
  FileCheck2,
  Map,
  Plane,
  Route
} from "lucide-react";
import {useState} from "react";
import {useTranslations} from "next-intl";

import {type Locale} from "@/lib/i18n/routing";
import {cn} from "@/lib/utils";

type ServiceKey =
  | "flights"
  | "hotels"
  | "cars"
  | "transfers"
  | "tours"
  | "visa";

type HomeSearchTabsProps = {
  locale: Locale;
};

const tabs = [
  {key: "flights", icon: Plane},
  {key: "hotels", icon: Building2},
  {key: "cars", icon: Car},
  {key: "transfers", icon: Route},
  {key: "tours", icon: Map},
  {key: "visa", icon: FileCheck2}
] as const satisfies Array<{icon: typeof Plane; key: ServiceKey}>;

function SearchFormLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid gap-4 xl:grid-cols-12"
    >
      <div className="h-11 rounded-lg bg-muted/70 xl:col-span-4" />
      <div className="h-11 rounded-lg bg-muted/70 xl:col-span-4" />
      <div className="h-11 rounded-lg bg-muted/70 xl:col-span-4" />
      <div className="h-11 rounded-lg bg-muted/50 xl:col-span-3" />
      <div className="h-11 rounded-lg bg-muted/50 xl:col-span-3" />
      <div className="h-11 rounded-lg bg-muted/50 xl:col-span-3" />
      <div className="h-11 rounded-lg bg-primary/20 xl:col-span-3" />
    </div>
  );
}

const FlightSearchForm = dynamic(
  () =>
    import("@/features/flights/components/flight-search-form").then(
      (module) => module.FlightSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

const HotelSearchForm = dynamic(
  () =>
    import("@/features/hotels/components/hotel-search-form").then(
      (module) => module.HotelSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

const CarSearchForm = dynamic(
  () =>
    import("@/features/cars/components/car-search-form").then(
      (module) => module.CarSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

const TransferSearchForm = dynamic(
  () =>
    import("@/features/transfers/components/transfer-search-form").then(
      (module) => module.TransferSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

const TourSearchForm = dynamic(
  () =>
    import("@/features/tours/components/tour-search-form").then(
      (module) => module.TourSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

const VisaSearchForm = dynamic(
  () =>
    import("@/features/visa/components/visa-search-form").then(
      (module) => module.VisaSearchForm
    ),
  {loading: SearchFormLoading, ssr: false}
);

export function HomeSearchTabs({locale}: HomeSearchTabsProps) {
  const t = useTranslations("SearchTabs");
  const [activeTab, setActiveTab] = useState<ServiceKey>("flights");

  return (
    <div className="aurevia-surface overflow-visible rounded-lg">
      <div className="border-b border-border/70 px-5 py-5 sm:px-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-[0.01em] sm:text-4xl">
            {t("title")}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="border-b border-border/70 px-4 py-4 sm:px-6">
        <div
          role="tablist"
          aria-label={t("tabListLabel")}
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {tabs.map(({key, icon: Icon}) => {
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${key}`}
                id={`tab-${key}`}
                className={cn(
                  "inline-flex min-w-max items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border/80 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setActiveTab(key)}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div
          id={`tab-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="space-y-5"
        >
          <p className="text-sm leading-7 text-muted-foreground">
            {t(`descriptions.${activeTab}`)}
          </p>

          {activeTab === "flights" ? <FlightSearchForm locale={locale} /> : null}
          {activeTab === "hotels" ? <HotelSearchForm locale={locale} /> : null}
          {activeTab === "cars" ? <CarSearchForm locale={locale} /> : null}
          {activeTab === "transfers" ? <TransferSearchForm locale={locale} /> : null}
          {activeTab === "tours" ? <TourSearchForm locale={locale} /> : null}
          {activeTab === "visa" ? <VisaSearchForm locale={locale} /> : null}
        </div>
      </div>
    </div>
  );
}
