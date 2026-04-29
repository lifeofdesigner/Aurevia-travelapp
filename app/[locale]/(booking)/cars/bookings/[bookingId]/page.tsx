import {CircleCheckBig} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatCarDateTime} from "@/features/cars/lib/formatters";
import {formatMoney} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {type Json} from "@/types/supabase";

type CarBookingConfirmationPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

type DriverMetadata = {
  firstName: string;
  lastName: string;
};

type BookingMetadata = {
  driver?: DriverMetadata;
  vendorName?: string;
  vehicleName?: string;
};

export default async function CarBookingConfirmationPage({
  params
}: CarBookingConfirmationPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Cars.confirmation"});
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

  const rentalResult = await supabase
    .from("car_rental_bookings")
    .select(
      "pickup_at, return_at, pickup_location_label, return_location_label, vehicle_category, transmission_type, fuel_policy, mileage_policy"
    )
    .eq("booking_item_id", bookingItem.id)
    .maybeSingle();
  const rental =
    (rentalResult.data as
      | {
          fuel_policy: string | null;
          mileage_policy: string | null;
          pickup_at: string;
          pickup_location_label: string;
          return_at: string;
          return_location_label: string;
          transmission_type: string | null;
          vehicle_category: string | null;
        }
      | null) ?? null;

  if (!rental) {
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
              <CardTitle>{t("rentalTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("vendorLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {metadata?.vendorName ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("vehicleLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {metadata?.vehicleName ?? bookingItem.title}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("pickupLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {rental.pickup_location_label}
                  <br />
                  {formatCarDateTime(rental.pickup_at, params.locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dropoffLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {rental.return_location_label}
                  <br />
                  {formatCarDateTime(rental.return_at, params.locale)}
                </span>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="font-medium text-foreground">
                  {[rental.vehicle_category, rental.transmission_type].filter(Boolean).join(" | ")}
                </p>
                {rental.fuel_policy ? (
                  <p className="text-muted-foreground">{rental.fuel_policy}</p>
                ) : null}
                {rental.mileage_policy ? (
                  <p className="text-muted-foreground">{rental.mileage_policy}</p>
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
            <CardTitle>{t("driverTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm">
            <p className="font-medium text-foreground">
              {metadata?.driver?.firstName ?? "-"} {metadata?.driver?.lastName ?? ""}
            </p>
            <p className="text-muted-foreground">{t("driverLabel")}</p>
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
