import {CircleCheckBig} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatTransferDateTime} from "@/features/transfers/lib/formatters";
import {formatMoney} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {type Json} from "@/types/supabase";

type TransferBookingConfirmationPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

type BookingMetadata = {
  flightNumber?: string;
  leadPassenger?: {
    firstName: string;
    lastName: string;
  };
  routeMode?: string;
};

export default async function TransferBookingConfirmationPage({
  params
}: TransferBookingConfirmationPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Transfers.confirmation"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();

  if (!userResult.data.user) {
    notFound();
  }

  const bookingResult = await supabase
    .from("bookings")
    .select(
      "id, booking_reference, currency_code, customer_email, subtotal_amount_minor, tax_amount_minor, total_amount_minor, metadata"
    )
    .eq("id", params.bookingId)
    .maybeSingle();
  const booking =
    (bookingResult.data as
      | {
          booking_reference: string;
          currency_code: string;
          customer_email: string;
          id: string;
          metadata: Json;
          subtotal_amount_minor: number;
          tax_amount_minor: number;
          total_amount_minor: number;
        }
      | null) ?? null;

  if (!booking) {
    notFound();
  }

  const bookingItemResult = await supabase
    .from("booking_items")
    .select("id, title")
    .eq("booking_id", booking.id)
    .maybeSingle();
  const bookingItem =
    (bookingItemResult.data as {id: string; title: string} | null) ?? null;

  if (!bookingItem) {
    notFound();
  }

  const transferResult = await supabase
    .from("airport_transfer_bookings")
    .select(
      "pickup_at, pickup_location_label, dropoff_location_label, passenger_count, luggage_count, transfer_type, meet_and_greet, vehicle_name"
    )
    .eq("booking_item_id", bookingItem.id)
    .maybeSingle();
  const transfer =
    (transferResult.data as
      | {
          dropoff_location_label: string;
          luggage_count: number;
          meet_and_greet: boolean;
          passenger_count: number;
          pickup_at: string;
          pickup_location_label: string;
          transfer_type: string;
          vehicle_name: string | null;
        }
      | null) ?? null;

  if (!transfer) {
    notFound();
  }

  const metadata = (booking.metadata as BookingMetadata | null) ?? null;

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CircleCheckBig aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("eyebrow")}
              </p>
              <CardTitle className="font-display text-4xl tracking-[0.01em]">
                {t("title")}
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("body", {reference: booking.booking_reference})}
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("referenceLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {booking.booking_reference}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("statusLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{t("statusPending")}</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("contactLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {booking.customer_email}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("transferTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("vehicleLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {transfer.vehicle_name ?? bookingItem.title}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("pickupLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {transfer.pickup_location_label}
                  <br />
                  {formatTransferDateTime(transfer.pickup_at, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dropoffLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {transfer.dropoff_location_label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("routeModeLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {metadata?.routeMode ? t(`routeModeOptions.${metadata.routeMode}`) : "-"}
                </span>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">
                  {t(`vehicleClassOptions.${transfer.transfer_type}`)}
                </p>
                <p className="text-muted-foreground">
                  {t("capacityValue", {
                    bags: transfer.luggage_count,
                    passengers: transfer.passenger_count
                  })}
                </p>
                <p className="text-muted-foreground">
                  {transfer.meet_and_greet
                    ? t("meetAndGreetIncluded")
                    : t("meetAndGreetExcluded")}
                </p>
                {metadata?.flightNumber ? (
                  <p className="text-muted-foreground">
                    {t("flightNumberValue", {flightNumber: metadata.flightNumber})}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("paymentTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("subtotalLabel")}</span>
                <span className="font-medium text-foreground">
                  {formatMoney(
                    {
                      amountMinor: booking.subtotal_amount_minor,
                      currency: booking.currency_code as "EUR" | "USD" | "GBP" | "AED" | "NGN"
                    },
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("taxesLabel")}</span>
                <span className="font-medium text-foreground">
                  {formatMoney(
                    {
                      amountMinor: booking.tax_amount_minor,
                      currency: booking.currency_code as "EUR" | "USD" | "GBP" | "AED" | "NGN"
                    },
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                <span className="font-semibold text-foreground">{t("totalLabel")}</span>
                <span className="font-display text-3xl text-foreground">
                  {formatMoney(
                    {
                      amountMinor: booking.total_amount_minor,
                      currency: booking.currency_code as "EUR" | "USD" | "GBP" | "AED" | "NGN"
                    },
                    params.locale
                  )}
                </span>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{t("pendingBody")}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("passengerTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm">
            <p className="font-medium text-foreground">
              {metadata?.leadPassenger?.firstName ?? "-"} {metadata?.leadPassenger?.lastName ?? ""}
            </p>
            <p className="text-muted-foreground">{t("leadPassengerLabel")}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="rounded-lg px-6">
            <Link href={`/${params.locale}/checkout/${booking.id}`}>
              {t("paymentAction")}
            </Link>
          </Button>
          <Button asChild className="rounded-lg px-6">
            <Link href={getLocalizedPath(ROUTES.dashboard, params.locale)}>
              {t("dashboardAction")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-lg px-6">
            <Link href={getLocalizedPath(ROUTES.home, params.locale)}>{t("homeAction")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
