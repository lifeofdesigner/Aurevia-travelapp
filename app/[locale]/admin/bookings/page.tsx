import Link from "next/link";
import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {Select} from "@/components/ui/select";
import {AdminPagination} from "@/features/admin/components/admin-pagination";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {
  formatMoney,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  toMinorUnit
} from "@/lib/money";
import {getAdminPageAccess} from "@/server/admin/auth";
import {listAdminBookings} from "@/server/admin/query-service";
import {BOOKING_STATUSES, BOOKING_TYPES, PAYMENT_STATUSES} from "@/types/database-enums";

type BookingsPageProps = {
  params: {locale: Locale};
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function parseMinorAmount(value: string, currency: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (isSupportedCurrency(currency)) {
    return toMinorUnit(parsed, currency);
  }

  return Math.round(parsed * 100);
}

export default async function AdminBookingsPage({
  params,
  searchParams
}: BookingsPageProps) {
  const access = await getAdminPageAccess("bookings.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const t = await getTranslations({locale: params.locale, namespace: "Admin"});
  const query = getStringValue(searchParams.q);
  const customer = getStringValue(searchParams.customer);
  const type = getStringValue(searchParams.type);
  const status = getStringValue(searchParams.status);
  const paymentStatus = getStringValue(searchParams.paymentStatus);
  const currency = getStringValue(searchParams.currency);
  const dateFrom = getStringValue(searchParams.dateFrom);
  const dateTo = getStringValue(searchParams.dateTo);
  const minAmount = getStringValue(searchParams.minAmount);
  const maxAmount = getStringValue(searchParams.maxAmount);
  const page = Number(getStringValue(searchParams.page) || "1");

  const {items, pagination} = await listAdminBookings({
    currency: isSupportedCurrency(currency) ? currency : undefined,
    customer: customer || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    maxTotalAmountMinor: parseMinorAmount(maxAmount, currency),
    minTotalAmountMinor: parseMinorAmount(minAmount, currency),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    paymentStatus:
      paymentStatus &&
      PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])
        ? (paymentStatus as (typeof PAYMENT_STATUSES)[number])
        : undefined,
    query: query || undefined,
    status: status ? (status as (typeof BOOKING_STATUSES)[number]) : undefined,
    type: type ? (type as (typeof BOOKING_TYPES)[number]) : undefined
  });

  const exportHref = new URLSearchParams({
    ...(query ? {q: query} : {}),
    ...(customer ? {customer} : {}),
    ...(type ? {type} : {}),
    ...(status ? {status} : {}),
    ...(paymentStatus ? {paymentStatus} : {}),
    ...(currency ? {currency} : {}),
    ...(dateFrom ? {dateFrom} : {}),
    ...(dateTo ? {dateTo} : {}),
    ...(minAmount ? {minAmount} : {}),
    ...(maxAmount ? {maxAmount} : {})
  }).toString();
  const canExportBookings = hasPermission(access.session.role, "export.all");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {label: t("pages.bookings.title")}
        ]}
        description={t("pages.bookings.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.bookings.title")}
      />

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("pages.bookings.filtersTitle")}</CardTitle>
            <p className="text-sm leading-7 text-muted-foreground">
              Filter by booking reference, customer, product, payment state, date range, and amount.
            </p>
          </div>
          {canExportBookings ? (
            <Button asChild className="bg-[#1c3d2e] text-white hover:bg-[#111d15]">
              <Link href={`/api/admin/bookings/export${exportHref ? `?${exportHref}` : ""}`}>
                Export CSV
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-query">
                Booking reference
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={query}
                id="booking-query"
                name="q"
                placeholder={t("pages.bookings.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-customer">
                Customer
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={customer}
                id="booking-customer"
                name="customer"
                placeholder="Name, email, or phone"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-type">
                {t("pages.bookings.typeLabel")}
              </label>
              <Select defaultValue={type} id="booking-type" name="type">
                <option value="">{t("pages.bookings.allTypes")}</option>
                {BOOKING_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t(`dashboard.bookingTypeOptions.${item}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-status">
                {t("pages.bookings.statusLabel")}
              </label>
              <Select defaultValue={status} id="booking-status" name="status">
                <option value="">{t("pages.bookings.allStatuses")}</option>
                {BOOKING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {t(`dashboard.bookingStatusOptions.${item}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-payment-status">
                Payment status
              </label>
              <Select defaultValue={paymentStatus} id="booking-payment-status" name="paymentStatus">
                <option value="">All payment statuses</option>
                {PAYMENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {t(`dashboard.paymentStatusOptions.${item}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-currency">
                Currency
              </label>
              <Select defaultValue={currency} id="booking-currency" name="currency">
                <option value="">All currencies</option>
                {SUPPORTED_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-date-from">
                Date from
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateFrom}
                id="booking-date-from"
                name="dateFrom"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-date-to">
                Date to
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateTo}
                id="booking-date-to"
                name="dateTo"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-min-amount">
                Min amount
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={minAmount}
                id="booking-min-amount"
                min="0"
                name="minAmount"
                placeholder="0.00"
                step="0.01"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="booking-max-amount">
                Max amount
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={maxAmount}
                id="booking-max-amount"
                min="0"
                name="maxAmount"
                placeholder="0.00"
                step="0.01"
                type="number"
              />
            </div>
            <div className="flex items-end gap-3 lg:col-span-4">
              <Button className="bg-[#1c3d2e] text-white hover:bg-[#111d15]" type="submit">
                {t("pages.bookings.applyFiltersAction")}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/${params.locale}/admin/bookings`}>
                  {t("pages.bookings.clearFiltersAction")}
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>{t("pages.bookings.recordsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-6">
              <h2 className="text-base font-semibold text-foreground">
                {t("pages.bookings.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("pages.bookings.emptyBody")}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-border/70 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.reference")}
                      </th>
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.customer")}
                      </th>
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.type")}
                      </th>
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.status")}
                      </th>
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.total")}
                      </th>
                      <th className="py-3 pr-4 font-medium">
                        {t("pages.bookings.columns.created")}
                      </th>
                      <th className="py-3 text-right font-medium">
                        {t("pages.bookings.columns.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {items.map((item) => (
                      <tr key={item.bookingId} className="hover:bg-[#f7f3ec]">
                        <td className="py-4 pr-4 font-medium text-foreground">
                          {item.bookingReference}
                        </td>
                        <td className="py-4 pr-4">
                          <p className="text-foreground">{item.customerName}</p>
                          <p className="text-muted-foreground">{item.customerEmail}</p>
                        </td>
                        <td className="py-4 pr-4 text-foreground">
                          {t(`dashboard.bookingTypeOptions.${item.primaryBookingType}`)}
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={t(`dashboard.bookingStatusOptions.${item.status}`)}
                              status={item.status}
                            />
                            <StatusBadge
                              label={t(`dashboard.paymentStatusOptions.${item.paymentStatus}`)}
                              status={item.paymentStatus}
                            />
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-foreground">
                          {formatMoney(
                            {amountMinor: item.totalAmountMinor, currency: item.currency},
                            params.locale
                          )}
                        </td>
                        <td className="py-4 pr-4 text-muted-foreground">
                          {formatDateTime(item.createdAt, params.locale)}
                        </td>
                        <td className="py-4 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/${params.locale}/admin/bookings/${item.bookingId}`}>
                              {t("pages.bookings.viewAction")}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 md:hidden">
                {items.map((item) => (
                  <div key={item.bookingId} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.bookingReference}</p>
                          <p className="text-sm text-muted-foreground">{item.customerName}</p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${params.locale}/admin/bookings/${item.bookingId}`}>
                            {t("pages.bookings.viewAction")}
                          </Link>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.customerEmail}</p>
                      <p className="text-sm text-foreground">
                        {formatMoney(
                          {amountMinor: item.totalAmountMinor, currency: item.currency},
                          params.locale
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={t(`dashboard.bookingStatusOptions.${item.status}`)}
                          status={item.status}
                        />
                        <StatusBadge
                          label={t(`dashboard.paymentStatusOptions.${item.paymentStatus}`)}
                          status={item.paymentStatus}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <AdminPagination
            locale={params.locale}
            page={pagination.page}
            pageCount={pagination.pageCount}
            pathname={`/${params.locale}/admin/bookings`}
            searchParams={searchParams}
          />
        </CardContent>
      </Card>
    </main>
  );
}
