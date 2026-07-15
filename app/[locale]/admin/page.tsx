import Link from "next/link";
import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAnalyticsCharts} from "@/features/admin/components/admin-analytics-charts";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {type Locale} from "@/lib/i18n/routing";
import {formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminDashboardAnalytics} from "@/server/admin/query-service";

type AdminPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminPage({params}: AdminPageProps) {
  const access = await getAdminPageAccess("analytics.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, analytics] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Admin"}),
    getAdminDashboardAnalytics()
  ]);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{label: t("pages.overview.title")}]}
        description={t("pages.overview.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.overview.title")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-secondary shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bookings today
            </p>
            <p className="font-display text-4xl italic text-foreground">
              {analytics.metrics.bookingsToday}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-secondary shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bookings this week
            </p>
            <p className="font-display text-4xl italic text-foreground">
              {analytics.metrics.bookingsThisWeek}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-secondary shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bookings this month
            </p>
            <p className="font-display text-4xl italic text-foreground">
              {analytics.metrics.bookingsThisMonth}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-secondary shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Active users right now
            </p>
            <p className="font-display text-4xl italic text-foreground">
              {analytics.metrics.activeUsersNow}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue today
            </p>
            <p className="font-display text-3xl italic text-foreground">
              {formatMoney(
                {amountMinor: analytics.metrics.revenueTodayMinor, currency: "EUR"},
                params.locale
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue this week
            </p>
            <p className="font-display text-3xl italic text-foreground">
              {formatMoney(
                {amountMinor: analytics.metrics.revenueThisWeekMinor, currency: "EUR"},
                params.locale
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue this month
            </p>
            <p className="font-display text-3xl italic text-foreground">
              {formatMoney(
                {amountMinor: analytics.metrics.revenueThisMonthMinor, currency: "EUR"},
                params.locale
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-none">
          <CardContent className="grid gap-3 p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Pending support tickets
              </p>
              <p className="mt-2 font-display text-3xl italic text-foreground">
                {analytics.metrics.pendingSupportTickets}
              </p>
            </div>
            <div className="border-t border-[#e8e0d0] pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Pending visa applications
              </p>
              <p className="mt-2 font-display text-3xl italic text-foreground">
                {analytics.metrics.pendingVisaApplications}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <AdminAnalyticsCharts
        bookingVolumeByType={analytics.bookingVolumeByType.map((item) => ({
          label: t(`dashboard.bookingTypeOptions.${item.label}`),
          value: item.value
        }))}
        currency="EUR"
        revenueByDay={analytics.revenueByDay}
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-card-foreground">
              Top booked routes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No flight routes have been booked yet.
              </p>
            ) : (
              analytics.topRoutes.map((route, index) => (
                <div
                  key={route.label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Rank {index + 1}
                    </p>
                    <p className="font-display text-[26px] italic text-foreground">
                      {route.value}
                    </p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{route.label}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-card-foreground">
              Recent bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings have been created yet.
              </p>
            ) : (
              analytics.recentBookings.map((booking) => (
                <Link
                  key={booking.bookingId}
                  className="block rounded-lg border border-border bg-background p-4 no-underline transition-colors hover:border-primary/40"
                  href={`/${params.locale}/admin/bookings/${booking.bookingId}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {booking.bookingReference}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.customerName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t(`dashboard.bookingTypeOptions.${booking.primaryBookingType}`)}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge
                          label={t(`dashboard.bookingStatusOptions.${booking.status}`)}
                          status={booking.status}
                        />
                        <StatusBadge
                          label={t(`dashboard.paymentStatusOptions.${booking.paymentStatus}`)}
                          status={booking.paymentStatus}
                        />
                      </div>
                      <p className="font-display text-[24px] italic text-foreground">
                        {formatMoney(
                          {
                            amountMinor: booking.totalAmountMinor,
                            currency: booking.currency
                          },
                          params.locale
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDateTime(booking.createdAt, params.locale)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
