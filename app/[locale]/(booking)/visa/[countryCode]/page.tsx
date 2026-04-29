import Link from "next/link";
import {notFound} from "next/navigation";

import {VisaProductCard} from "@/features/visa/components/visa-product-card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getPublicVisaCountryCatalog} from "@/server/visa/public-catalog-service";

type VisaCountryPageProps = {
  params: {
    countryCode: string;
    locale: Locale;
  };
};

function getCountryFlag(countryCode: string) {
  return countryCode
    .toUpperCase()
    .slice(0, 2)
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

export default async function VisaCountryPage({params}: VisaCountryPageProps) {
  const [branding, catalog] = await Promise.all([
    getSiteBranding(),
    getPublicVisaCountryCatalog(params.locale, params.countryCode)
  ]);

  if (!catalog) {
    notFound();
  }

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <Link
            href={getLocalizedPath(ROUTES.visa, params.locale)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to visa destinations
          </Link>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a84c]">
              Destination visa products
            </p>
            <h1 className="font-display text-4xl italic text-[#1c3d2e] sm:text-5xl">
              {getCountryFlag(catalog.country.code)} {catalog.country.name}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[#7a9a85]">
              Choose the visa support track that fits your trip. Each option highlights
              processing time, price guidance, validity notes, and the documents {branding.siteName}
              expects before a full application review.
            </p>
          </div>
        </div>

        {catalog.products.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#e8e0d0] bg-white p-6 text-sm leading-7 text-[#7a9a85]">
            No published visa products are available for {catalog.country.name} yet.
          </div>
        ) : (
          <div className="grid gap-5">
            {catalog.products.map((product) => (
              <div key={`${catalog.country.code}-${product.key}`} className="space-y-4">
                <VisaProductCard
                  applyHref={`${getLocalizedPath(ROUTES.visa, params.locale)}/${catalog.country.code}/apply?visaType=${product.key}`}
                  applyLabel="Apply now"
                  priceBody={product.priceLabel}
                  priceLabel="Price guidance"
                  requirements={product.requirements}
                  requirementsLabel="Documents required"
                  summary={product.summary}
                  timelineBody={product.processingTimelineLabel}
                  timelineLabel="Processing time"
                  title={product.title}
                />

                <div className="rounded-[8px] border border-[#e8e0d0] bg-[#f7f3ec] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                    Validity
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#1c3d2e]">
                    {product.validityLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
