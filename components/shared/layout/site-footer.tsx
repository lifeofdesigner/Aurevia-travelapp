import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type SiteFooterProps = {
  locale: Locale;
};

const legalLinks = [
  {key: "privacy", route: ROUTES.privacy},
  {key: "terms", route: ROUTES.terms},
  {key: "cookies", route: ROUTES.cookies},
  {key: "refunds", route: ROUTES.refunds}
] as const;

export async function SiteFooter({locale}: SiteFooterProps) {
  const t = await getTranslations({locale, namespace: "Footer"});

  return (
    <footer className="border-t bg-card">
      <div className="container flex flex-col gap-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>{t("copyright", {year: new Date().getFullYear()})}</p>
        <nav aria-label={t("legalLabel")} className="flex flex-wrap gap-x-4 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.key}
              href={getLocalizedPath(link.route, locale)}
              className="rounded-sm hover:text-foreground hover:underline"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
