import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";

type AdminPaginationProps = {
  locale: Locale;
  page: number;
  pageCount: number;
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
};

function buildHref({
  page,
  pathname,
  searchParams
}: {
  page: number;
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    } else if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }

  params.set("page", String(page));
  return `${pathname}?${params.toString()}`;
}

export async function AdminPagination({
  locale,
  page,
  pageCount,
  pathname,
  searchParams
}: AdminPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const t = await getTranslations({locale, namespace: "Admin.pagination"});

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
      <Button asChild disabled={page <= 1} variant="outline">
        <Link aria-disabled={page <= 1} href={buildHref({page: Math.max(page - 1, 1), pathname, searchParams})}>
          {t("previous")}
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("pageLabel", {page, pageCount})}
      </p>
      <Button asChild disabled={page >= pageCount} variant="outline">
        <Link
          aria-disabled={page >= pageCount}
          href={buildHref({page: Math.min(page + 1, pageCount), pathname, searchParams})}
        >
          {t("next")}
        </Link>
      </Button>
    </div>
  );
}
