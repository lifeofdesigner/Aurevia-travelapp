import {Plane} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {locales, type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {cn} from "@/lib/utils";

type SiteHeaderProps = {
  locale: Locale;
};

const navItems = [
  {key: "home", route: ROUTES.home},
  {key: "dashboard", route: ROUTES.dashboard},
  {key: "admin", route: ROUTES.admin}
] as const;

export async function SiteHeader({locale}: SiteHeaderProps) {
  const t = await getTranslations({locale, namespace: "Navigation"});

  return (
    <header className="sticky top-0 z-40 border-b bg-background/94 backdrop-blur">
      <div className="container flex min-h-16 items-center justify-between gap-4">
        <Link
          href={getLocalizedPath(ROUTES.home, locale)}
          className="inline-flex items-center gap-2 rounded-md text-base font-semibold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plane aria-hidden="true" className="h-4 w-4" />
          </span>
          <span>Aurevia Travel</span>
        </Link>

        <nav
          aria-label={t("primaryLabel")}
          className="hidden items-center gap-1 md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={getLocalizedPath(item.route, locale)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-md border p-1 sm:flex">
            {locales.map((availableLocale) => (
              <Link
                key={availableLocale}
                href={getLocalizedPath(ROUTES.home, availableLocale)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-semibold uppercase text-muted-foreground",
                  availableLocale === locale && "bg-primary text-primary-foreground"
                )}
              >
                {availableLocale}
              </Link>
            ))}
          </div>
          <Button asChild size="sm">
            <Link href={getLocalizedPath(ROUTES.auth, locale)}>
              {t("signIn")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
