import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminDataRequestReviewForm} from "@/features/admin/components/admin-data-request-review-form";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminPagination} from "@/features/admin/components/admin-pagination";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {type Locale} from "@/lib/i18n/routing";
import {DATA_REQUEST_STATUSES, DATA_REQUEST_TYPES} from "@/types/database-enums";
import {formatDateTime} from "@/lib/dates";
import {getAdminReferenceData} from "@/server/admin/query-service";
import {getAdminPageAccess} from "@/server/admin/auth";
import {listAdminDataRequests} from "@/server/privacy/data-request-service";

type AdminPrivacyPageProps = {
  params: {locale: Locale};
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminPrivacyPage({
  params,
  searchParams
}: AdminPrivacyPageProps) {
  const access = await getAdminPageAccess("settings.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const t = await getTranslations({locale: params.locale, namespace: "Admin"});
  const query = getStringValue(searchParams.q);
  const type = getStringValue(searchParams.type);
  const status = getStringValue(searchParams.status);
  const page = Number(getStringValue(searchParams.page) || "1");

  const [{items, pagination}, references] = await Promise.all([
    listAdminDataRequests({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      query: query || undefined,
      status: status ? (status as (typeof DATA_REQUEST_STATUSES)[number]) : undefined,
      type: type ? (type as (typeof DATA_REQUEST_TYPES)[number]) : undefined
    }),
    getAdminReferenceData()
  ]);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {label: t("pages.privacy.title")}
        ]}
        description={t("pages.privacy.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.privacy.title")}
      />

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>{t("pages.privacy.filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="privacy-query">
                {t("pages.privacy.searchLabel")}
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={query}
                id="privacy-query"
                name="q"
                placeholder={t("pages.privacy.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="privacy-type">
                {t("pages.privacy.typeLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={type}
                id="privacy-type"
                name="type"
              >
                <option value="">{t("pages.privacy.allTypes")}</option>
                {DATA_REQUEST_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t(`privacy.requestTypeOptions.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="privacy-status">
                {t("pages.privacy.statusLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={status}
                id="privacy-status"
                name="status"
              >
                <option value="">{t("pages.privacy.allStatuses")}</option>
                {DATA_REQUEST_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {t(`privacy.statusOptions.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/92" type="submit">
                {t("pages.privacy.applyFiltersAction")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.length === 0 ? (
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-foreground">{t("pages.privacy.emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("pages.privacy.emptyBody")}</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{t(`privacy.requestTypeOptions.${item.requestType}`)}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.customerName} | {item.customerEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("pages.privacy.createdLabel")}: {formatDateTime(item.createdAt, params.locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={t(`privacy.statusOptions.${item.status}`)}
                      status={item.status}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {typeof item.requestDetails.details === "string" && item.requestDetails.details.length > 0 ? (
                  <p className="text-sm leading-7 text-muted-foreground">{item.requestDetails.details}</p>
                ) : null}

                {item.summary ? (
                  <div className="grid gap-3 rounded-lg border border-border/80 bg-background/70 p-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                    <p>{t("pages.privacy.summary.bookings")}: {item.summary.bookingsCount}</p>
                    <p>{t("pages.privacy.summary.finance")}: {item.summary.financeRecordsCount}</p>
                    <p>{t("pages.privacy.summary.travelers")}: {item.summary.travelerProfilesCount}</p>
                    <p>{t("pages.privacy.summary.uploads")}: {item.summary.uploadsCount}</p>
                    <p>{t("pages.privacy.summary.visa")}: {item.summary.visaApplicationsCount}</p>
                    <div className="space-y-1 md:col-span-2 xl:col-span-3">
                      <p className="font-medium text-foreground">{t("pages.privacy.retentionTitle")}</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {item.summary.retentionFlags.map((flag) => (
                          <li key={flag}>{t(`pages.privacy.retentionFlags.${flag}`)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <AdminDataRequestReviewForm
                  adminOptions={references.adminUsers}
                  assignedAdminUserId={item.assignedAdminUserId}
                  rejectedReason={item.rejectedReason}
                  requestId={item.id}
                  responseSummary={item.responseSummary}
                  status={item.status}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AdminPagination
        locale={params.locale}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pathname={`/${params.locale}/admin/privacy`}
        searchParams={searchParams}
      />
    </main>
  );
}
