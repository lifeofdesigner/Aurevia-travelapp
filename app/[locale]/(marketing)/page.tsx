import {
  Building2,
  CarFront,
  FileCheck2,
  Map,
  Plane,
  Route,
  type LucideIcon
} from "lucide-react";
import {type Metadata} from "next";
import Image from "next/image";
import Link from "next/link";

import {HomeSearchTabs} from "@/components/shared/home/home-search-tabs";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {type Locale} from "@/lib/i18n/routing";
import {type AppRoute, getLocalizedPath, ROUTES} from "@/lib/routes";
import {buildCanonicalUrl, buildLocaleAlternates} from "@/lib/seo";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getHomepageData} from "@/server/homepage/get-homepage-data";

type HomePageProps = {
  params: {
    locale: Locale;
  };
};

const serviceIcons: Record<string, LucideIcon> = {
  cars: CarFront,
  flights: Plane,
  hotels: Building2,
  tours: Map,
  transfers: Route,
  visa: FileCheck2
};

function resolveHref(value: string | null | undefined, fallback: string) {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value;
}

function renderInlineDots(items: string[]) {
  return items.flatMap((item, index) => [
    <span key={`item-${item}`}>{item}</span>,
    index < items.length - 1 ? (
      <span key={`dot-${item}`} className="h-[6px] w-[6px] rounded-[3px] bg-[#c9a84c]" />
    ) : null
  ]);
}

export async function generateMetadata({params}: HomePageProps): Promise<Metadata> {
  const canonicalUrl = buildCanonicalUrl(ROUTES.home, params.locale);
  const [branding, homepageData] = await Promise.all([
    getSiteBranding(),
    getHomepageData(params.locale)
  ]);

  return {
    title: branding.siteName,
    description: homepageData.hero.subheadline,
    alternates: {
      canonical: canonicalUrl.toString(),
      ...buildLocaleAlternates(ROUTES.home)
    },
    openGraph: {
      title: homepageData.hero.headline,
      description: homepageData.hero.subheadline,
      url: canonicalUrl,
      siteName: branding.siteName,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      description: homepageData.hero.subheadline,
      title: homepageData.hero.headline
    }
  };
}

export default async function HomePage({params}: HomePageProps) {
  const homepageData = await getHomepageData(params.locale);
  const homeHref = getLocalizedPath(ROUTES.home, params.locale);
  const conciergeHref = getLocalizedPath(ROUTES.auth, params.locale);
  const destinationsHref = `${homeHref}#destinations`;
  const firstBanner = homepageData.banners[0] ?? null;
  const additionalBanners = homepageData.banners.slice(firstBanner ? 1 : 0);

  return (
    <main id="main-content" className="overflow-hidden bg-[#f7f3ec] font-sans text-[#1c3d2e]">
      <section
        className="relative bg-[#1c3d2e]"
        style={
          homepageData.hero.bgImageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(17, 29, 21, 0.72), rgba(17, 29, 21, 0.78)), url(${homepageData.hero.bgImageUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover"
              }
            : undefined
        }
      >
        <div className="container pb-10 pt-10 sm:pt-12 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10">
            <div className="space-y-6">
              <span className="inline-flex rounded-[10px] border border-[#c9a84c] px-4 py-2 text-[11px] tracking-[0.22em] text-[#f5f0e8]">
                {homepageData.copy.heroBadge}
              </span>

              <div className="space-y-4">
                <h1 className="font-display text-[40px] italic leading-[0.94] text-[#f5f0e8] sm:text-[44px] lg:text-[48px]">
                  {homepageData.hero.headline}
                </h1>
                <p className="max-w-[33rem] text-[13px] leading-6 text-[rgba(232,223,200,0.7)]">
                  {homepageData.hero.subheadline}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={resolveHref(homepageData.hero.ctaLink, "#search-planner")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#c9a84c] px-5 py-3 text-[12px] font-semibold text-[#1c3d2e] no-underline transition-colors hover:bg-[#d5b45b]"
                >
                  {homepageData.hero.ctaText}
                </Link>
                <Link
                  href={destinationsHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[rgba(245,240,232,0.28)] px-5 py-3 text-[12px] font-semibold text-[#f5f0e8] no-underline transition-colors hover:border-[#c9a84c] hover:bg-white/5"
                >
                  View Destinations
                </Link>
              </div>
            </div>

            {firstBanner ? (
              <article className="overflow-hidden rounded-[10px] bg-[#f5f0e8] text-[#1c3d2e] shadow-[0_18px_40px_rgba(8,22,16,0.22)]">
                {firstBanner.imageUrl ? (
                  <div className="relative h-[220px]">
                    <Image
                      fill
                      alt={firstBanner.title}
                      className="object-cover"
                      priority
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      src={firstBanner.imageUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-2">
                      <span className="inline-flex rounded-[10px] bg-[#c9a84c] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c3d2e]">
                        Featured promotion
                      </span>
                      <h2 className="font-display text-[28px] italic leading-[1] text-white">
                        {firstBanner.title}
                      </h2>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4 p-6">
                  {!firstBanner.imageUrl ? (
                    <h2 className="font-display text-[28px] italic leading-[1] text-[#1c3d2e]">
                      {firstBanner.title}
                    </h2>
                  ) : null}
                  {firstBanner.subtitle ? (
                    <p className="text-[13px] leading-6 text-[rgba(28,61,46,0.68)]">
                      {firstBanner.subtitle}
                    </p>
                  ) : null}
                  {firstBanner.ctaText ? (
                    <Link
                      href={resolveHref(firstBanner.ctaLink, getLocalizedPath(ROUTES.flights, params.locale))}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] bg-[#1c3d2e] px-5 py-3 text-[12px] font-semibold text-[#f5f0e8] no-underline transition-colors hover:bg-[#2a5a40]"
                    >
                      {firstBanner.ctaText}
                    </Link>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>

          <div id="search-planner" className="scroll-mt-28 pt-8">
            <HomeSearchTabs locale={params.locale} />
          </div>
        </div>
      </section>

      <section className="border-b border-[#e8e0d0] bg-white">
        <div className="container py-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-[11px] text-[#7a9a85] sm:gap-4">
            {renderInlineDots(homepageData.settings.trustItems)}
          </div>
        </div>
      </section>

      {additionalBanners.length > 0 ? (
        <section className="bg-white py-16 sm:py-[4.5rem]">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c9a84c]">
                {homepageData.copy.bannersEyebrow}
              </p>
              <h2 className="font-display text-[30px] italic leading-[1.02] text-[#1c3d2e] sm:text-[34px]">
                {homepageData.copy.bannersTitle}
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {additionalBanners.map((banner) => (
                <article
                  key={`${banner.title}-${banner.ctaLink ?? "banner"}`}
                  className="overflow-hidden rounded-[8px] border border-[#e8e0d0] bg-[#f7f3ec]"
                >
                  {banner.imageUrl ? (
                    <div className="relative h-[200px]">
                      <Image
                        fill
                        alt={banner.title}
                        className="object-cover"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        src={banner.imageUrl}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                      <h3 className="absolute bottom-4 left-4 right-4 font-display text-[24px] italic text-white">
                        {banner.title}
                      </h3>
                    </div>
                  ) : null}

                  <div className="space-y-4 p-5">
                    {!banner.imageUrl ? (
                      <h3 className="font-display text-[24px] italic text-[#1c3d2e]">
                        {banner.title}
                      </h3>
                    ) : null}
                    {banner.subtitle ? (
                      <p className="text-[12px] leading-6 text-[#7a9a85]">{banner.subtitle}</p>
                    ) : null}
                    {banner.ctaText ? (
                      <Link
                        href={resolveHref(banner.ctaLink, homeHref)}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-[8px] bg-[#c9a84c] px-4 text-[12px] font-semibold text-[#1c3d2e] no-underline transition-colors hover:bg-[#d5b45b]"
                      >
                        {banner.ctaText}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="destinations" className="scroll-mt-28 bg-[#f7f3ec] py-16 sm:py-[4.5rem]">
        <div className="container space-y-8">
          <div className="max-w-[44rem] space-y-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c9a84c]">
              {homepageData.copy.destinationsEyebrow}
            </p>
            <h2 className="font-display text-[30px] italic leading-[1.02] text-[#1c3d2e] sm:text-[34px]">
              {homepageData.copy.destinationsTitle}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {homepageData.destinations.map((destination) => (
              <article
                key={`${destination.city}-${destination.country}`}
                className="overflow-hidden rounded-[8px] border border-[#e8e0d0] bg-white"
              >
                <div className="relative h-[220px]">
                  <Image
                    fill
                    alt={`${destination.city}, ${destination.country}`}
                    className="object-cover"
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    src={destination.imageUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  {destination.priceLabel ? (
                    <span className="absolute left-3 top-3 inline-flex rounded-[10px] bg-[#c9a84c] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c3d2e]">
                      {destination.priceLabel}
                    </span>
                  ) : null}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-display text-[24px] italic text-white">
                      {destination.city}
                    </h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.75)]">
                      {destination.country}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#7a9a85]">
                      {destination.hotelsCount ? `${destination.hotelsCount}+ hotels` : "Curated destination"}
                    </p>
                  </div>
                  <Link
                    href={resolveHref(destination.link, getLocalizedPath(ROUTES.hotels, params.locale))}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-[8px] bg-[#f0ebe0] px-4 text-[12px] font-semibold text-[#1c3d2e] no-underline transition-colors hover:bg-[#1c3d2e] hover:text-[#f5f0e8]"
                  >
                    Explore
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-[4.5rem]">
        <div className="container space-y-8">
          <div className="space-y-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c9a84c]">
              Flight Deals
            </p>
            <h2 className="font-display text-[30px] italic leading-[1.02] text-[#1c3d2e] sm:text-[34px]">
              Best fares this week
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {homepageData.deals.map((deal) => (
              <article
                key={`${deal.originCode}-${deal.destinationCode}-${deal.airlineName}`}
                className="overflow-hidden rounded-[8px] border border-[#e8e0d0] bg-white"
              >
                {deal.imageUrl ? (
                  <div className="relative h-[140px]">
                    <Image
                      fill
                      alt={`${deal.destinationCity} skyline`}
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      src={deal.imageUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <h3 className="absolute bottom-4 left-4 font-display text-[22px] italic text-white">
                      {deal.destinationCity}
                    </h3>
                  </div>
                ) : null}

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#7a9a85]">
                      {deal.originCity} to {deal.destinationCity}
                    </p>
                    <CurrencyAmount
                      amountMinor={deal.price}
                      className="block font-display text-[22px] text-[#1c3d2e]"
                      fromCurrency={deal.currency}
                      locale={params.locale}
                      options={{maximumFractionDigits: 0}}
                    />
                    <p className="text-[11px] leading-5 text-[#7a9a85]">
                      {deal.airlineName}
                      {deal.fareType ? ` · ${deal.fareType}` : ""}
                    </p>
                  </div>

                  <Link
                    href={getLocalizedPath(ROUTES.flights, params.locale)}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-[8px] bg-[#f7f3ec] px-4 text-[12px] font-semibold text-[#1c3d2e] no-underline transition-colors hover:bg-[#1c3d2e] hover:text-[#f5f0e8]"
                  >
                    Book Now
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why-aurevia" className="scroll-mt-28 bg-[#1c3d2e] py-16 sm:py-[4.5rem]">
        <div className="container grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c9a84c]">
                {homepageData.copy.whyEyebrow}
              </p>
              <h2 className="max-w-[34rem] font-display text-[30px] italic leading-[1.02] text-[#f5f0e8] sm:text-[34px]">
                {homepageData.settings.why.headline}
              </h2>
              <p className="max-w-[32rem] text-[13px] leading-6 text-[rgba(232,223,200,0.7)]">
                {homepageData.settings.why.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {homepageData.settings.stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                className="border-l-2 border-[#c9a84c] pl-4"
              >
                <p className="font-display text-[40px] italic leading-none text-[#c9a84c]">
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#e8dfc8]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-28 bg-[#f7f3ec] py-16 sm:py-[4.5rem]">
        <div className="container space-y-8">
          <div className="max-w-[42rem] space-y-3">
            <h2 className="font-display text-[30px] italic leading-[1.02] text-[#1c3d2e] sm:text-[34px]">
              {homepageData.copy.sectionServicesTitle}
            </h2>
            <p className="text-[13px] leading-6 text-[#7a9a85]">
              {homepageData.copy.sectionServicesSummary}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {homepageData.services.map((service) => {
              const Icon = serviceIcons[service.route.replace("/", "")] ?? Plane;

              return (
                <article
                  key={service.title}
                  className="flex h-full flex-col rounded-[8px] border border-[#e8e0d0] bg-white p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#f0ebe0] text-[#1c3d2e]">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 font-display text-[17px] italic text-[#1c3d2e]">
                    {service.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[11px] leading-5 text-[#7a9a85]">
                    {service.description}
                  </p>
                  <Link
                    href={getLocalizedPath(service.route as AppRoute, params.locale)}
                    className="mt-4 inline-flex text-[12px] font-semibold text-[#c9a84c] no-underline transition-opacity hover:opacity-80"
                  >
                    {`Go to ${service.title} →`}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ec] pb-20 pt-2 sm:pt-4">
        <div className="container">
          <div className="rounded-[10px] bg-[#1c3d2e] px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-[30px] italic leading-[1.02] text-[#f5f0e8] sm:text-[34px]">
                  {homepageData.settings.cta.headline}
                </h2>
                <p className="max-w-[36rem] text-[13px] leading-6 text-[rgba(232,223,200,0.7)]">
                  {homepageData.settings.cta.description}
                </p>
              </div>
              <Link
                href={conciergeHref}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#c9a84c] px-5 py-3 text-[12px] font-semibold text-[#1c3d2e] no-underline transition-colors hover:bg-[#d5b45b]"
              >
                {homepageData.copy.ctaButtonLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
