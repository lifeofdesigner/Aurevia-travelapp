import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {type Locale} from "@/lib/i18n/routing";
import {formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {listBookingsForUser} from "@/server/account/dashboard-service";
import {BOOKING_STATUSES, BOOKING_TYPES} from "@/types/database-enums";

type BookingsPageProps = {
  params: {
    locale: Locale;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

function getValue(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingsPage({
  params,
  searchParams
}: BookingsPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/bookings`
  );
  const [t, bookings] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Dashboard.bookings"}),
    listBookingsForUser(user.id, {
      query: getValue(searchParams, "q"),
      status: getValue(searchParams, "status"),
      type: getValue(searchParams, "type")
    })
  ]);

  const groupedBookings = new Map<string, typeof bookings>();

  for (const booking of bookings) {
    const group = groupedBookings.get(booking.primaryBookingType) ?? [];
    group.push(booking);
    groupedBookings.set(booking.primaryBookingType, group);
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>{t("filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <label htmlFor="booking-search" className="text-sm font-medium text-foreground">
                {t("searchLabel")}
              </label>
              <Input
                id="booking-search"
                name="q"
                defaultValue={getValue(searchParams, "q") ?? ""}
                placeholder={t("searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="booking-type" className="text-sm font-medium text-foreground">
                {t("typeLabel")}
              </label>
              <Select id="booking-type" name="type" defaultValue={getValue(searchParams, "type") ?? ""}>
                <option value="">{t("allTypes")}</option>
                {BOOKING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`typeOptions.${type}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="booking-status" className="text-sm font-medium text-foreground">
                {t("statusLabel")}
              </label>
              <Select
                id="booking-status"
                name="status"
                defaultValue={getValue(searchParams, "status") ?? ""}
              >
                <option value="">{t("allStatuses")}</option>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`statusOptions.${status}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit" className="rounded-lg px-5">
                {t("applyFiltersAction")}
              </Button>
              <Button asChild type="button" variant="outline" className="rounded-lg px-5">
                <Link href={`/${params.locale}/dashboard/bookings`}>{t("clearFiltersAction")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {bookings.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-background/70">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(groupedBookings.entries()).map(([bookingType, group]) => (
          <Card key={bookingType} className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {t(`typeOptions.${bookingType}`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.map((booking) => (
                <Link
                  key={booking.bookingId}
                  href={`/${params.locale}/dashboard/bookings/${booking.bookingId}`}
                  className="block rounded-lg border border-border/80 bg-background/70 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {booking.firstItemTitle ?? booking.bookingReference}
                        </p>
                        <StatusBadge
                          label={t(`statusOptions.${booking.status}`)}
                          status={booking.status}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.bookingReference} | {formatDateTime(booking.createdAt, params.locale)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.firstItemDescription ?? t("descriptionFallback")}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="font-semibold text-foreground">
                        {formatMoney(
                          {
                            amountMinor: booking.totalAmountMinor,
                            currency: booking.currency
                          },
                          params.locale
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("travelerCountValue", {count: booking.travelerCount})}
                      </p>
                      {booking.invoiceNumber ? (
                        <p className="text-sm text-muted-foreground">
                          {t("invoiceValue", {invoiceNumber: booking.invoiceNumber})}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
