import {Search} from "lucide-react";
import Link from "next/link";

import {VisaProductCard} from "@/features/visa/components/visa-product-card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {findVisaCountryOptionByQuery} from "@/features/visa/lib/catalog";
import {getSiteBranding} from "@/server/brand/site-branding";
import {
  listPopularVisaCountries,
  listPublicVisaCatalog
} from "@/server/visa/public-catalog-service";

type VisaPageProps = {
  params: {
    locale: Locale;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function getCountryFlag(countryCode: string) {
  return countryCode
    .toUpperCase()
    .slice(0, 2)
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

export default async function VisaPage({params, searchParams}: VisaPageProps) {
  const submittedQuery =
    getStringValue(searchParams.country) ||
    getStringValue(searchParams.destinationCountry) ||
    getStringValue(searchParams.q);
  const selectedCountry = findVisaCountryOptionByQuery(submittedQuery);
  const [branding, catalog, popularCountries] = await Promise.all([
    getSiteBranding(),
    listPublicVisaCatalog(params.locale),
    Promise.resolve(listPopularVisaCountries())
  ]);
  const selectedProducts = selectedCountry
    ? catalog.filter((product) => product.countryCode === selectedCountry.code)
    : [];
  const hasSearchQuery = submittedQuery.trim().length > 0;

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="overflow-hidden rounded-[10px] border border-border bg-card shadow-soft">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10">
            <div className="space-y-5">
              <span className="inline-flex rounded-[8px] bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                Visa support
              </span>
              <div className="space-y-3">
                <h1 className="font-display text-4xl italic text-foreground sm:text-5xl">
                  Start your visa trip planning with the destination first.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  Search the country you want to visit, review the available {branding.siteName}
                  visa support products, and move into the guided application flow step by step.
                </p>
              </div>
            </div>

            <div className="rounded-[10px] border border-border bg-background p-5">
              <form action={getLocalizedPath(ROUTES.visa, params.locale)} className="space-y-3">
                <label
                  htmlFor="visa-country-search"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Destination search
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="visa-country-search"
                      name="country"
                      defaultValue={selectedCountry?.name ?? submittedQuery}
                      placeholder="I want to travel to..."
                      className="h-12 w-full rounded-[8px] border border-input bg-background pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-[8px] bg-primary px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-dark"
                  >
                    Find visa options
                  </button>
                </div>
              </form>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Popular destinations below jump straight into available visa support products.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a84c]">
              Popular destinations
            </p>
            <h2 className="font-display text-3xl italic text-[#1c3d2e]">
              Choose a destination country
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {popularCountries.map((country) => (
              <Link
                key={country.code}
                href={`${getLocalizedPath(ROUTES.visa, params.locale)}?country=${country.slug}#visa-products`}
                className="group rounded-[8px] border border-[#e8e0d0] bg-white p-5 no-underline shadow-soft transition-colors hover:border-[#c9a84c]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCountryFlag(country.code)}
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium text-[#1c3d2e]">{country.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#7a9a85]">
                      {country.code}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#7a9a85]">
                  Review current visa support products for {country.name}.
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section id="visa-products" className="scroll-mt-28 space-y-5">
          {selectedCountry ? (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a84c]">
                  Selected destination
                </p>
                <h2 className="font-display text-3xl italic text-[#1c3d2e]">
                  {getCountryFlag(selectedCountry.code)} {selectedCountry.name}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#7a9a85]">
                  These are the current {branding.siteName} visa support products available for{" "}
                  {selectedCountry.name}.
                </p>
              </div>

              {selectedProducts.length > 0 ? (
                <div className="grid gap-5">
                  {selectedProducts.map((product) => (
                    <VisaProductCard
                      applyHref={`${getLocalizedPath(ROUTES.visa, params.locale)}/${selectedCountry.code}/apply`}
                      applyLabel="Apply now"
                      detailHref={`${getLocalizedPath(ROUTES.visa, params.locale)}/${selectedCountry.code}`}
                      detailLabel="View visa types"
                      key={`${product.countryCode}-${product.serviceCode}`}
                      priceBody={product.priceLabel}
                      priceLabel="From"
                      requirements={product.requirements}
                      requirementsLabel="Required documents"
                      summary={product.summary}
                      timelineBody={product.processingTimelineLabel}
                      timelineLabel="Processing time"
                      title={product.title}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[8px] border border-dashed border-[#e8e0d0] bg-white p-6 text-sm leading-7 text-[#7a9a85]">
                  No visa support products are published for {selectedCountry.name} yet.
                </div>
              )}
            </>
          ) : hasSearchQuery ? (
            <div className="rounded-[8px] border border-dashed border-[#e8e0d0] bg-white p-6 text-sm leading-7 text-[#7a9a85]">
              We could not match that destination yet. Try Austria, United Arab Emirates,
              or United Kingdom from the popular destinations above.
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#e8e0d0] bg-white p-6 text-sm leading-7 text-[#7a9a85]">
              Search for a country or pick one of the popular destinations to reveal
              the visa support products.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
