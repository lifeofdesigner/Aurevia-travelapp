import {getTranslations} from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {formatBusinessAddressForDocuments, type SiteBranding} from "@/server/brand/site-branding";
import {getHomepageData} from "@/server/homepage/get-homepage-data";

type SiteFooterProps = {
  branding: SiteBranding;
  locale: Locale;
};

const legalLinks = [
  {key: "privacy", route: ROUTES.privacy},
  {key: "terms", route: ROUTES.terms},
  {key: "cookies", route: ROUTES.cookies},
  {key: "refunds", route: ROUTES.refunds}
] as const;

const serviceLinks = [
  {label: "Flights", route: ROUTES.flights},
  {label: "Hotels", route: ROUTES.hotels},
  {label: "Cars", route: ROUTES.cars},
  {label: "Tours", route: ROUTES.tours},
  {label: "Transfers", route: ROUTES.transfers},
  {label: "Visa", route: ROUTES.visa}
] as const;

const socialLinks = [
  {
    ariaLabelPrefix: "Visit",
    href: "https://www.instagram.com/",
    label: "Instagram"
  },
  {
    ariaLabelPrefix: "Visit",
    href: "https://www.linkedin.com/",
    label: "LinkedIn"
  },
  {
    ariaLabelPrefix: "Message",
    href: "https://www.whatsapp.com/",
    label: "WhatsApp"
  }
] as const;

const linkClassName =
  "text-[12px] text-[rgba(232,223,200,0.4)] no-underline transition-colors hover:text-[#c9a84c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111d15]";

function splitBrandName(siteName: string) {
  const [first, ...rest] = siteName.trim().split(/\s+/);

  return {
    first: first || "Travel",
    rest: rest.join(" ") || "Desk"
  };
}

export async function SiteFooter({branding, locale}: SiteFooterProps) {
  const [t, homepageData] = await Promise.all([
    getTranslations({locale, namespace: "Footer"}),
    getHomepageData(locale)
  ]);

  return (
    <footer className="bg-[#111d15]">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(232,223,200,0.35)]">
                Brand
              </p>
              <div className="inline-flex min-h-12 items-center gap-2">
                {branding.logoUrl ? (
                  <Image
                    alt={`${branding.siteName} logo`}
                    className="max-h-12 w-auto object-contain"
                    height={48}
                    src={branding.logoUrl}
                    width={190}
                  />
                ) : (
                  <>
                    <span className="font-display text-[28px] leading-none text-[#e8dfc8]">
                      {splitBrandName(branding.siteName).first}
                    </span>
                    <span className="font-display text-[28px] leading-none text-[#c9a84c]">
                      {splitBrandName(branding.siteName).rest}
                    </span>
                  </>
                )}
              </div>
              <p className="max-w-sm text-[12px] leading-6 text-[rgba(232,223,200,0.4)]">
                {homepageData.settings.footerTagline || t("trustCopy")}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={`${link.ariaLabelPrefix} ${branding.siteName} on ${link.label}`}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClassName}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(232,223,200,0.35)]">
              Services
            </p>
            <nav aria-label="Services" className="flex flex-col gap-3">
              {serviceLinks.map((link) => (
                <Link
                  key={link.route}
                  href={getLocalizedPath(link.route, locale)}
                  className={linkClassName}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(232,223,200,0.35)]">
              Company
            </p>
            <div className="flex flex-col gap-3">
              <Link href={getLocalizedPath(ROUTES.home, locale)} className={linkClassName}>
                {branding.siteName}
              </Link>
              <Link href={getLocalizedPath(ROUTES.auth, locale)} className={linkClassName}>
                Sign in
              </Link>
              <a href={`mailto:${branding.contactEmail}`} className={linkClassName}>
                {branding.contactEmail}
              </a>
              <p className="text-[12px] text-[rgba(232,223,200,0.4)]">
                {branding.businessLocation}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(232,223,200,0.35)]">
              Legal
            </p>
            <nav aria-label={t("legalLabel")} className="flex flex-col gap-3">
              {legalLinks.map((link) => (
                <Link
                  key={link.key}
                  href={getLocalizedPath(link.route, locale)}
                  className={linkClassName}
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-[rgba(232,223,200,0.1)] pt-5">
          <p className="text-[12px] text-[rgba(232,223,200,0.4)]">
            &copy; 2026 {branding.siteName}. {formatBusinessAddressForDocuments(branding)}.
          </p>
        </div>
      </div>
    </footer>
  );
}
