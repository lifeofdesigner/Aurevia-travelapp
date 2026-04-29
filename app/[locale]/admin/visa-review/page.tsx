import Link from "next/link";
import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminPagination} from "@/features/admin/components/admin-pagination";
import {AdminVisaReviewQueue} from "@/features/admin/components/admin-visa-review-queue";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminReferenceData, listAdminVisaQueue} from "@/server/admin/query-service";
import {VISA_APPLICATION_STATUSES} from "@/types/database-enums";

type VisaReviewPageProps = {
  params: {locale: Locale};
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminVisaReviewPage({
  params,
  searchParams
}: VisaReviewPageProps) {
  const access = await getAdminPageAccess("visa.review");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const t = await getTranslations({locale: params.locale, namespace: "Admin"});
  const page = Number(getStringValue(searchParams.page) || "1");
  const status = getStringValue(searchParams.status);
  const countryCode = getStringValue(searchParams.countryCode);
  const dateFrom = getStringValue(searchParams.dateFrom);
  const dateTo = getStringValue(searchParams.dateTo);
  const query = getStringValue(searchParams.q);

  const [{items, pagination}, references] = await Promise.all([
    listAdminVisaQueue({
      countryCode: countryCode || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      query: query || undefined,
      status: status ? (status as (typeof VISA_APPLICATION_STATUSES)[number]) : undefined
    }),
    getAdminReferenceData()
  ]);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {label: t("pages.visaReview.title")}
        ]}
        description={t("pages.visaReview.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.visaReview.title")}
      />

      <Card className="border-border/80 bg-card shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-2xl italic text-foreground">
            Queue filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="visa-query">
                {t("pages.visaReview.searchLabel")}
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={query}
                id="visa-query"
                name="q"
                placeholder={t("pages.visaReview.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="visa-status">
                {t("pages.visaReview.statusLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={status}
                id="visa-status"
                name="status"
              >
                <option value="">{t("pages.visaReview.allStatuses")}</option>
                {VISA_APPLICATION_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {t(`dashboard.visaStatusOptions.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="visa-country">
                Country
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={countryCode}
                id="visa-country"
                name="countryCode"
              >
                <option value="">All countries</option>
                {references.countries.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="visa-date-from">
                Date from
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateFrom}
                id="visa-date-from"
                name="dateFrom"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="visa-date-to">
                Date to
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateTo}
                id="visa-date-to"
                name="dateTo"
                type="date"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3 lg:col-span-5">
              <Button className="bg-[#1c3d2e] text-white hover:bg-[#111d15]" type="submit">
                {t("pages.visaReview.applyFiltersAction")}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/${params.locale}/admin/visa-review`}>Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card className="border-border/80 bg-card shadow-soft">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground">
              {t("pages.visaReview.emptyTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t("pages.visaReview.emptyBody")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <AdminVisaReviewQueue items={items} locale={params.locale} />
      )}

      <AdminPagination
        locale={params.locale}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pathname={`/${params.locale}/admin/visa-review`}
        searchParams={searchParams}
      />
    </main>
  );
}
