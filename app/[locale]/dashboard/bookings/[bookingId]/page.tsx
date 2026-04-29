import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";
import {type ReactNode} from "react";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatDate, formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {cn} from "@/lib/utils";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getBookingDetailForUser} from "@/server/account/dashboard-service";
import {type BookingDetailItem} from "@/features/account/types";

type BookingDetailPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

const responsiveTileGridClass =
  "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]";

function DetailTile({
  children,
  className,
  framed = true,
  label,
  surface = "background"
}: {
  children: ReactNode;
  className?: string;
  framed?: boolean;
  label: string;
  surface?: "background" | "card";
}) {
  return (
    <div
      className={cn(
        "min-w-0",
        framed
          ? "rounded-lg border border-border/70 p-4"
          : null,
        framed && surface === "card" ? "bg-card/92" : null,
        framed && surface === "background" ? "bg-background/70" : null,
        className
      )}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 min-w-0 break-words text-sm font-medium leading-6 text-foreground [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}

function buildSnapshotFacts(
  item: BookingDetailItem,
  locale: Locale,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const payload = asRecord(item.snapshotPayload);

  switch (item.bookingType) {
    case "hotel": {
      const offer = asRecord(payload.offer);
      const selectedRoom = asRecord(payload.selectedRoom);

      return [
        {label: t("factLabels.property"), value: asString(offer.propertyName)},
        {label: t("factLabels.room"), value: asString(selectedRoom.roomName)},
        {
          label: t("factLabels.board"),
          value: humanize(asString(selectedRoom.rateType))
        },
        {
          label: t("factLabels.stay"),
          value:
            asString(offer.checkIn) && asString(offer.checkOut)
              ? `${formatDate(asString(offer.checkIn), locale)} - ${formatDate(asString(offer.checkOut), locale)}`
              : ""
        }
      ].filter((fact) => fact.value.length > 0);
    }
    case "car_rental": {
      const offer = asRecord(payload.offer);

      return [
        {label: t("factLabels.vendor"), value: asString(offer.vendorName)},
        {label: t("factLabels.vehicle"), value: asString(offer.vehicleCategory)},
        {label: t("factLabels.pickup"), value: asString(offer.pickupLocationLabel)},
        {label: t("factLabels.dropoff"), value: asString(offer.dropoffLocationLabel)}
      ].filter((fact) => fact.value.length > 0);
    }
    case "airport_transfer": {
      const offer = asRecord(payload.offer);

      return [
        {
          label: t("factLabels.route"),
          value: humanize(asString(offer.routeMode))
        },
        {label: t("factLabels.vehicle"), value: asString(offer.vehicleName)},
        {label: t("factLabels.pickup"), value: asString(offer.pickupLocationLabel)},
        {label: t("factLabels.dropoff"), value: asString(offer.dropoffLocationLabel)}
      ].filter((fact) => fact.value.length > 0);
    }
    case "tour": {
      const offer = asRecord(payload.offer);
      const selectedSlot = asRecord(payload.selectedSlot);
      const participantCounts = asRecord(payload.participantCounts);
      const adults = asNumber(participantCounts.adults);
      const children = asNumber(participantCounts.children);

      return [
        {label: t("factLabels.experience"), value: asString(offer.title)},
        {label: t("factLabels.slot"), value: asString(selectedSlot.label)},
        {label: t("factLabels.meetingPoint"), value: asString(offer.meetingPoint)},
        {
          label: t("factLabels.participants"),
          value:
            adults !== null || children !== null
              ? t("participantMixValue", {
                  adults: adults ?? 0,
                  children: children ?? 0
                })
              : ""
        }
      ].filter((fact) => fact.value.length > 0);
    }
    case "flight": {
      const offer = asRecord(payload.offer);
      const airlineNames = Array.isArray(offer.airlineNames)
        ? offer.airlineNames.filter((entry): entry is string => typeof entry === "string")
        : [];

      return [
        {
          label: t("factLabels.route"),
          value:
            asString(offer.originAirportCode) && asString(offer.destinationAirportCode)
              ? `${asString(offer.originAirportCode)} - ${asString(offer.destinationAirportCode)}`
              : ""
        },
        {
          label: t("factLabels.airlines"),
          value: airlineNames.join(", ")
        },
        {
          label: t("factLabels.cabin"),
          value: humanize(asString(offer.cabinClass))
        },
        {
          label: t("factLabels.tripType"),
          value: humanize(asString(offer.tripType))
        }
      ].filter((fact) => fact.value.length > 0);
    }
    default:
      return [];
  }
}

export default async function BookingDetailPage({
  params
}: BookingDetailPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/bookings/${params.bookingId}`
  );
  const [booking, t] = await Promise.all([
    getBookingDetailForUser(user.id, params.bookingId),
    getTranslations({locale: params.locale, namespace: "Dashboard.bookingDetail"})
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${params.locale}/dashboard/bookings`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("backAction")}
          </Link>
          <h2 className="break-words font-display text-3xl text-foreground [overflow-wrap:anywhere]">
            {booking.bookingReference}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={t(`statusOptions.${booking.status}`)}
            status={booking.status}
          />
          <StatusBadge
            label={t(`paymentStatusOptions.${booking.paymentStatus}`)}
            status={booking.paymentStatus}
          />
          {booking.invoiceStatus ? (
            <StatusBadge
              label={t(`invoiceStatusOptions.${booking.invoiceStatus}`)}
              status={booking.invoiceStatus}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("snapshotTitle")}</CardTitle>
            </CardHeader>
            <CardContent className={responsiveTileGridClass}>
              <DetailTile label={t("createdAtLabel")}>
                {formatDateTime(booking.createdAt, params.locale)}
              </DetailTile>
              <DetailTile label={t("confirmedAtLabel")}>
                {booking.confirmedAt
                  ? formatDateTime(booking.confirmedAt, params.locale)
                  : t("notConfirmed")}
              </DetailTile>
              <DetailTile label={t("serviceTypeLabel")}>
                {t(`typeOptions.${booking.primaryBookingType}`)}
              </DetailTile>
              <DetailTile label={t("contactLabel")}>
                {booking.customerEmail}
              </DetailTile>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("itemsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.items.map((item) => {
                const facts = buildSnapshotFacts(item, params.locale, t);

                return (
                  <div
                    key={item.bookingItemId}
                    className="min-w-0 rounded-lg border border-border/80 bg-background/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words font-medium text-foreground [overflow-wrap:anywhere]">
                            {item.title}
                          </p>
                          <StatusBadge
                            label={t(`statusOptions.${item.status}`)}
                            status={item.status}
                          />
                        </div>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {item.description ?? t("descriptionFallback")}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatMoney(
                          {
                            amountMinor: item.totalAmountMinor,
                            currency: item.currency
                          },
                          params.locale
                        )}
                      </p>
                    </div>

                    <div className={cn("mt-4", responsiveTileGridClass)}>
                      {item.serviceStartAt ? (
                        <DetailTile label={t("serviceStartLabel")} surface="card">
                            {formatDateTime(item.serviceStartAt, params.locale)}
                        </DetailTile>
                      ) : null}
                      {item.serviceEndAt ? (
                        <DetailTile label={t("serviceEndLabel")} surface="card">
                            {formatDateTime(item.serviceEndAt, params.locale)}
                        </DetailTile>
                      ) : null}
                      <DetailTile label={t("quantityLabel")} surface="card">
                        {item.quantity}
                      </DetailTile>
                      {item.supplierConfirmationReference ? (
                        <DetailTile label={t("supplierReferenceLabel")} surface="card">
                          {item.supplierConfirmationReference}
                        </DetailTile>
                      ) : null}
                    </div>

                    {facts.length > 0 ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {facts.map((fact) => (
                          <DetailTile
                            key={`${item.bookingItemId}-${fact.label}`}
                            label={fact.label}
                            surface="card"
                          >
                            {fact.value}
                          </DetailTile>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("travelersTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.travelers.length === 0 ? (
                <p className="text-sm leading-7 text-muted-foreground">{t("travelersEmpty")}</p>
              ) : (
                booking.travelers.map((traveler) => (
                  <div
                    key={traveler.id}
                    className="min-w-0 rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words font-medium text-foreground [overflow-wrap:anywhere]">
                        {traveler.firstName} {traveler.lastName}
                      </p>
                      <StatusBadge
                        label={t(`travelerTypeOptions.${traveler.travelerType}`)}
                        status={traveler.travelerType}
                      />
                    </div>
                    <div className={cn("mt-4", responsiveTileGridClass)}>
                      <DetailTile label={t("dateOfBirthLabel")} framed={false}>
                          {traveler.dateOfBirth
                            ? formatDate(traveler.dateOfBirth, params.locale)
                            : t("emptyValue")}
                      </DetailTile>
                      <DetailTile label={t("nationalityLabel")} framed={false}>
                        {traveler.nationalityCountryCode ?? t("emptyValue")}
                      </DetailTile>
                      <DetailTile label={t("documentLast4Label")} framed={false}>
                          {traveler.documentNumberLast4 ?? t("emptyValue")}
                      </DetailTile>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("totalsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("subtotalLabel")}</span>
                <span className="break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
                  {formatMoney(
                    {
                      amountMinor: booking.subtotalAmountMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("taxLabel")}</span>
                <span className="break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
                  {formatMoney(
                    {
                      amountMinor: booking.taxAmountMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("discountLabel")}</span>
                <span className="break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
                  {formatMoney(
                    {
                      amountMinor: booking.discountAmountMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                <span className="font-semibold text-foreground">{t("totalLabel")}</span>
                <span className="break-words text-right font-display text-3xl text-foreground [overflow-wrap:anywhere]">
                  {formatMoney(
                    {
                      amountMinor: booking.totalAmountMinor,
                      currency: booking.currency
                    },
                    params.locale
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("paymentTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailTile label={t("paymentStatusLabel")}>
                {t(`paymentStatusOptions.${booking.paymentStatus}`)}
              </DetailTile>
              {booking.paymentAmountCapturedMinor > 0 ? (
                <DetailTile label={t("capturedLabel")}>
                    {formatMoney(
                      {
                        amountMinor: booking.paymentAmountCapturedMinor,
                        currency: booking.currency
                      },
                      params.locale
                    )}
                </DetailTile>
              ) : null}
              {booking.paymentAmountRefundedMinor > 0 ? (
                <DetailTile label={t("refundedLabel")}>
                    {formatMoney(
                      {
                        amountMinor: booking.paymentAmountRefundedMinor,
                        currency: booking.currency
                      },
                      params.locale
                    )}
                </DetailTile>
              ) : null}
              <div className="flex flex-col gap-3">
                <Button asChild className="rounded-lg px-5">
                  <a
                    href={`/api/bookings/${booking.bookingId}/ticket?locale=${params.locale}`}
                    target="_blank"
                  >
                    Download E-Ticket
                  </a>
                </Button>
                {booking.status === "pending_payment" ? (
                  <Button asChild className="rounded-lg px-5">
                    <Link href={`/${params.locale}/checkout/${booking.bookingId}`}>
                      {t("paymentReviewAction")}
                    </Link>
                  </Button>
                ) : null}
                {booking.invoiceId ? (
                  <Button asChild variant="outline" className="rounded-lg px-5">
                    <a href={`/api/invoices/${booking.invoiceId}/pdf`}>
                      {t("invoiceDownloadAction")}
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("billingTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(booking.billingAddress).length === 0 ? (
                <p className="text-sm leading-7 text-muted-foreground">{t("billingEmpty")}</p>
              ) : (
                <div className="min-w-0 space-y-2 text-sm text-foreground">
                  {Object.entries(booking.billingAddress).map(([key, value]) => (
                    <p key={key} className="break-words [overflow-wrap:anywhere]">
                      <span className="font-medium">{humanize(key)}:</span>{" "}
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl">{t("refundsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.refunds.length === 0 ? (
                <p className="text-sm leading-7 text-muted-foreground">{t("refundsEmpty")}</p>
              ) : (
                booking.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="min-w-0 rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
                          {formatMoney(
                            {
                              amountMinor: refund.amountMinor,
                              currency: refund.currency
                            },
                            params.locale
                          )}
                        </p>
                        <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                          {formatDateTime(refund.createdAt, params.locale)}
                        </p>
                        {refund.reason ? (
                          <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            {refund.reason}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge
                        label={t(`refundStatusOptions.${refund.status}`)}
                        status={refund.status}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
