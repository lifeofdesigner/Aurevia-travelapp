import Link from "next/link";
import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminPagination} from "@/features/admin/components/admin-pagination";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getAdminPageAccess} from "@/server/admin/auth";
import {listAdminCustomers} from "@/server/admin/query-service";
import {USER_ROLES} from "@/types/database-enums";

type CustomersPageProps = {
  params: {locale: Locale};
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminCustomersPage({
  params,
  searchParams
}: CustomersPageProps) {
  const access = await getAdminPageAccess("customers.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const t = await getTranslations({locale: params.locale, namespace: "Admin"});
  const page = Number(getStringValue(searchParams.page) || "1");
  const query = getStringValue(searchParams.q);
  const role = getStringValue(searchParams.role);

  const {items, pagination} = await listAdminCustomers({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    query: query || undefined,
    role: role ? (role as (typeof USER_ROLES)[number]) : undefined
  });

  const exportHref = new URLSearchParams({
    ...(query ? {q: query} : {}),
    ...(role ? {role} : {})
  }).toString();
  const canExportCustomers = hasPermission(access.session.role, "export.all");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {label: t("pages.customers.title")}
        ]}
        description={t("pages.customers.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.customers.title")}
      />

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Search and filter</CardTitle>
            <p className="text-sm leading-7 text-muted-foreground">
              Search by name, email, or phone and open any customer for the full profile.
            </p>
          </div>
          {canExportCustomers ? (
            <Button asChild className="bg-[#1c3d2e] text-white hover:bg-[#111d15]">
              <Link href={`/api/admin/customers/export${exportHref ? `?${exportHref}` : ""}`}>
                Export CSV
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="customer-query">
                {t("pages.customers.searchLabel")}
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={query}
                id="customer-query"
                name="q"
                placeholder={t("pages.customers.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="customer-role">
                {t("pages.customers.roleLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={role}
                id="customer-role"
                name="role"
              >
                <option value="">{t("pages.customers.allRoles")}</option>
                {USER_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {t(`shell.roleOptions.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="bg-[#1c3d2e] text-white hover:bg-[#111d15]" type="submit">
                {t("pages.customers.applyFiltersAction")}
              </Button>
            </div>
            <div className="flex items-end">
              <Button asChild type="button" variant="outline">
                <Link href={`/${params.locale}/admin/customers`}>Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-6">
              <h2 className="text-base font-semibold text-foreground">
                {t("pages.customers.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("pages.customers.emptyBody")}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-border/70 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Customer</th>
                      <th className="py-3 pr-4 font-medium">Role</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 pr-4 font-medium">Activity</th>
                      <th className="py-3 pr-4 font-medium">Spend</th>
                      <th className="py-3 pr-4 font-medium">Last login</th>
                      <th className="py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {items.map((item) => {
                      const customerName =
                        `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email;

                      return (
                        <tr key={item.userId} className="hover:bg-[#f7f3ec]">
                          <td className="py-4 pr-4">
                            <p className="font-medium text-foreground">{customerName}</p>
                            <p className="text-muted-foreground">{item.email}</p>
                            <p className="text-muted-foreground">{item.phone ?? "No phone"}</p>
                          </td>
                          <td className="py-4 pr-4 text-foreground">
                            {t(`shell.roleOptions.${item.role}`)}
                          </td>
                          <td className="py-4 pr-4">
                            <StatusBadge
                              label={item.isSuspended ? "suspended" : "active"}
                              status={item.isSuspended ? "cancelled" : "confirmed"}
                            />
                          </td>
                          <td className="py-4 pr-4 text-muted-foreground">
                            {item.bookingCount} bookings | {item.visaApplicationCount} visa
                          </td>
                          <td className="py-4 pr-4 text-foreground">
                            {item.spendSummary.length === 0
                              ? "No spend"
                              : item.spendSummary.map((entry) =>
                                  formatMoney(
                                    {
                                      amountMinor: entry.amountMinor,
                                      currency: entry.currency
                                    },
                                    params.locale
                                  )
                                ).join(" | ")}
                          </td>
                          <td className="py-4 pr-4 text-muted-foreground">
                            {item.lastSignedInAt
                              ? formatDateTime(item.lastSignedInAt, params.locale)
                              : "Not available"}
                          </td>
                          <td className="py-4 text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/${params.locale}/admin/customers/${item.userId}`}>
                                View details
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 md:hidden">
                {items.map((item) => {
                  const customerName =
                    `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email;

                  return (
                    <div key={item.userId} className="rounded-lg border border-border/80 bg-background/70 p-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{customerName}</p>
                            <p className="text-sm text-muted-foreground">{item.email}</p>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/${params.locale}/admin/customers/${item.userId}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={item.isSuspended ? "suspended" : "active"}
                            status={item.isSuspended ? "cancelled" : "confirmed"}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.bookingCount} bookings | {item.visaApplicationCount} visa applications
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <AdminPagination
            locale={params.locale}
            page={pagination.page}
            pageCount={pagination.pageCount}
            pathname={`/${params.locale}/admin/customers`}
            searchParams={searchParams}
          />
        </CardContent>
      </Card>
    </main>
  );
}
