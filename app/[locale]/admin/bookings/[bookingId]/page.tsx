import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminBookingOperations} from "@/features/admin/components/admin-booking-operations";
import {AdminNoteComposer} from "@/features/admin/components/admin-note-composer";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDate, formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminBookingDetail} from "@/server/admin/query-service";

type BookingDetailPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

function stringifySnapshotValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== null && typeof entry !== "undefined")
      .slice(0, 3)
      .map(([key, entry]) => `${key}: ${String(entry)}`);

    return entries.length > 0 ? entries.join(" | ") : null;
  }

  return null;
}

export default async function AdminBookingDetailPage({
  params
}: BookingDetailPageProps) {
  const access = await getAdminPageAccess("bookings.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, booking] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Admin"}),
    getAdminBookingDetail(params.bookingId)
  ]);

  if (!booking) {
    notFound();
  }

  const canEditBooking = hasPermission(access.session.role, "bookings.edit");
  const canRefundBooking = hasPermission(access.session.role, "bookings.refund");
  const canEmailCustomer = canEditBooking;
  const canExportBookings = hasPermission(access.session.role, "export.all");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {href: `/${params.locale}/admin/bookings`, label: t("pages.bookings.title")},
          {label: booking.bookingReference}
        ]}
        description={t("pages.bookingDetail.description")}
        eyebrow={t("shell.eyebrow")}
        title={booking.bookingReference}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/api/bookings/${booking.bookingId}/ticket?locale=${params.locale}`} target="_blank">
            Download E-Ticket
          </Link>
        </Button>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-dark">
          <Link href={`/api/admin/bookings/${booking.bookingId}/pdf?locale=${params.locale}`} target="_blank">
            Download booking PDF
          </Link>
        </Button>
        {canExportBookings ? (
          <Button asChild variant="outline">
            <Link href={`/api/admin/bookings/export?q=${booking.bookingReference}`}>
              Export matching bookings CSV
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("pages.bookingDetail.summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("pages.bookingDetail.customerLabel")}
                </p>
                <p className="mt-1 font-medium text-foreground">{booking.customerName}</p>
                <p className="text-muted-foreground">{booking.customerEmail}</p>
                <p className="text-muted-foreground">{booking.customerPhone ?? "Not available"}</p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={t(`dashboard.bookingStatusOptions.${booking.status}`)}
                    status={booking.status}
                  />
                  <StatusBadge
                    label={t(`dashboard.paymentStatusOptions.${booking.paymentStatus}`)}
                    status={booking.paymentStatus}
                  />
                </div>
                <p className="text-muted-foreground">
                  {t("pages.bookingDetail.createdLabel")}:{" "}
                  {formatDateTime(booking.createdAt, params.locale)}
                </p>
                <p className="text-muted-foreground">
                  {t("pages.bookingDetail.confirmedLabel")}:{" "}
                  {booking.confirmedAt
                    ? formatDateTime(booking.confirmedAt, params.locale)
                    : t("pages.bookingDetail.notConfirmed")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("pages.bookingDetail.totalLabel")}
                </p>
                <p className="mt-2 font-display text-3xl text-foreground">
                  {formatMoney(
                    {amountMinor: booking.totalAmountMinor, currency: booking.currency},
                    params.locale
                  )}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("pages.bookingDetail.taxLabel")}:{" "}
                  {formatMoney(
                    {amountMinor: booking.taxAmountMinor, currency: booking.currency},
                    params.locale
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("pages.bookingDetail.paymentTitle")}
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {formatMoney(
                    {
                      amountMinor: booking.paymentAmountCapturedMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("pages.bookingDetail.refundedLabel")}:{" "}
                  {formatMoney(
                    {
                      amountMinor: booking.paymentAmountRefundedMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AdminBookingOperations
            bookingId={booking.bookingId}
            bookingReference={booking.bookingReference}
            canEditBooking={canEditBooking}
            canEmailCustomer={canEmailCustomer}
            canRefundBooking={canRefundBooking}
            currency={booking.currency}
            currentStatus={booking.status}
            customerEmail={booking.customerEmail}
            locale={params.locale}
            paymentAmountCapturedMinor={booking.paymentAmountCapturedMinor}
            paymentAmountRefundedMinor={booking.paymentAmountRefundedMinor}
            paymentStatus={booking.paymentStatus}
          />

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("pages.bookingDetail.adminNotesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEditBooking ? (
                <AdminNoteComposer entityId={booking.bookingId} entityType="booking" />
              ) : null}
              <div className="space-y-3">
                {booking.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("pages.bookingDetail.adminNotesEmpty")}
                  </p>
                ) : (
                  booking.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {note.title ?? t("notes.untitled")}
                        </p>
                        <StatusBadge
                          label={
                            note.isVisibleToCustomer
                              ? t("pages.bookingDetail.visibleToCustomer")
                              : t("pages.bookingDetail.internalOnly")
                          }
                          status={note.isVisibleToCustomer ? "published" : "draft"}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {note.noteBody}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {note.authorLabel} | {formatDateTime(note.createdAt, params.locale)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("pages.bookingDetail.itemsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.items.map((item) => (
              <div key={item.bookingItemId} className="rounded-lg border border-border/80 bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`dashboard.bookingTypeOptions.${item.bookingType}`)}
                    </p>
                  </div>
                  <StatusBadge
                    label={t(`dashboard.bookingStatusOptions.${item.status}`)}
                    status={item.status}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-muted-foreground">
                    {t("pages.bookingDetail.serviceWindowLabel")}:{" "}
                    {item.serviceStartAt
                      ? formatDateTime(item.serviceStartAt, params.locale)
                      : "Not available"}
                    {item.serviceEndAt
                      ? ` -> ${formatDateTime(item.serviceEndAt, params.locale)}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pages.bookingDetail.quantityLabel")}: {item.quantity}
                  </p>
                </div>
                {item.description ? (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(item.snapshotPayload)
                    .map(([key, value]) => [key, stringifySnapshotValue(value)] as const)
                    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
                    .slice(0, 8)
                    .map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {key}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{value}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("pages.bookingDetail.travelersTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.travelers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("pages.bookingDetail.travelersEmpty")}
                </p>
              ) : (
                booking.travelers.map((traveler) => (
                  <div key={traveler.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="font-medium text-foreground">
                      {traveler.firstName} {traveler.lastName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`pages.bookingDetail.travelerTypeOptions.${traveler.travelerType}`)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {traveler.dateOfBirth
                        ? formatDate(traveler.dateOfBirth, params.locale)
                        : "Not available"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>Refund history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.refunds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No refunds have been recorded for this booking yet.
                </p>
              ) : (
                booking.refunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-foreground">
                        {formatMoney(
                          {
                            amountMinor: refund.amountMinor,
                            currency: refund.currency
                          },
                          params.locale
                        )}
                      </p>
                      <StatusBadge label={refund.status} status={refund.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDateTime(refund.createdAt, params.locale)}
                    </p>
                    {refund.reason ? (
                      <p className="mt-2 text-sm text-muted-foreground">{refund.reason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("pages.bookingDetail.supportTicketsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.supportTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("pages.bookingDetail.supportTicketsEmpty")}
                </p>
              ) : (
                booking.supportTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{ticket.ticketNumber}</p>
                        <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                      </div>
                      <StatusBadge label={ticket.status} status={ticket.status} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("pages.bookingDetail.auditTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.auditTrail.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("pages.bookingDetail.auditEmpty")}
                </p>
              ) : (
                booking.auditTrail.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="font-medium text-foreground">{event.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{event.actorLabel}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDateTime(event.createdAt, params.locale)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
