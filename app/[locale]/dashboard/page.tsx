import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatDate, formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getDashboardOverviewForUser} from "@/server/account/dashboard-service";

type DashboardPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function DashboardPage({params}: DashboardPageProps) {
  const user = await requireAuthenticatedUser(params.locale, `/${params.locale}/dashboard`);
  const [overview, t] = await Promise.all([
    getDashboardOverviewForUser(user.id),
    getTranslations({locale: params.locale, namespace: "Dashboard.overview"})
  ]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("cards.totalBookings")}
            </p>
            <p className="font-display text-4xl text-foreground">
              {overview.totalBookingsCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("cards.pendingPayments")}
            </p>
            <p className="font-display text-4xl text-foreground">
              {overview.pendingPaymentBookingsCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("cards.savedTravelers")}
            </p>
            <p className="font-display text-4xl text-foreground">
              {overview.savedTravelersCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("cards.activeVisa")}
            </p>
            <p className="font-display text-4xl text-foreground">
              {overview.activeVisaApplicationsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="font-display text-2xl">{t("recentBookingsTitle")}</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">{t("recentBookingsBody")}</p>
            </div>
            <Button asChild variant="outline" className="rounded-lg px-5">
              <Link href={`/${params.locale}/dashboard/bookings`}>{t("viewAllBookings")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.recentBookings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                {t("recentBookingsEmpty")}
              </div>
            ) : (
              overview.recentBookings.map((booking) => (
                <Link
                  key={booking.bookingId}
                  href={`/${params.locale}/dashboard/bookings/${booking.bookingId}`}
                  className="block rounded-lg border border-border/80 bg-background/70 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        {booking.firstItemTitle ?? booking.bookingReference}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.bookingReference} | {formatDateTime(booking.createdAt, params.locale)}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusBadge
                        label={t(`bookingStatus.${booking.status}`)}
                        status={booking.status}
                      />
                      <p className="font-semibold text-foreground">
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
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="font-display text-2xl">{t("recentInvoicesTitle")}</CardTitle>
                <p className="text-sm leading-7 text-muted-foreground">{t("recentInvoicesBody")}</p>
              </div>
              <Button asChild variant="outline" className="rounded-lg px-5">
                <Link href={`/${params.locale}/dashboard/payments`}>{t("paymentsAction")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.recentInvoices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                  {t("recentInvoicesEmpty")}
                </div>
              ) : (
                overview.recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.bookingReference ?? t("invoiceWithoutBooking")}
                        </p>
                      </div>
                      <StatusBadge
                        label={t(`invoiceStatus.${invoice.status}`)}
                        status={invoice.status}
                      />
                    </div>
                    <p className="mt-3 font-semibold text-foreground">
                      {formatMoney(
                        {
                          amountMinor: invoice.totalAmountMinor,
                          currency: invoice.currency
                        },
                        params.locale
                      )}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="font-display text-2xl">{t("recentVisaTitle")}</CardTitle>
                <p className="text-sm leading-7 text-muted-foreground">{t("recentVisaBody")}</p>
              </div>
              <Button asChild variant="outline" className="rounded-lg px-5">
                <Link href={`/${params.locale}/dashboard/visa`}>{t("visaAction")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.recentVisaApplications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                  {t("recentVisaEmpty")}
                </div>
              ) : (
                overview.recentVisaApplications.map((application) => (
                  <Link
                    key={application.id}
                    href={`/${params.locale}/dashboard/visa/${application.id}`}
                    className="block rounded-lg border border-border/80 bg-background/70 p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {application.applicationReference ?? t("draftReference")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.countryCode} | {formatDate(application.updatedAt, params.locale)}
                        </p>
                      </div>
                      <StatusBadge
                        label={t(`visaStatus.${application.status}`)}
                        status={application.status}
                      />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
