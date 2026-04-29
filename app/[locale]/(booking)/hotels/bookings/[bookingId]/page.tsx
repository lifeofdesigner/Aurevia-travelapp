import {CircleCheckBig} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatHotelStayDates} from "@/features/hotels/lib/formatters";
import {formatMoney} from "@/lib/money";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";

type HotelBookingConfirmationPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

type TravelerSnapshot = {
  firstName: string;
  guestType: string;
  lastName: string;
};

export default async function HotelBookingConfirmationPage({
  params
}: HotelBookingConfirmationPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Hotels.confirmation"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();

  if (!userResult.data.user) {
    notFound();
  }

  const bookingResult = await supabase
    .from("bookings")
    .select("id, booking_reference, currency_code, customer_email, status, subtotal_amount_minor, tax_amount_minor, total_amount_minor, traveler_summary")
    .eq("id", params.bookingId)
    .maybeSingle();
  const booking =
    (bookingResult.data as
      | {
          booking_reference: string;
          currency_code: string;
          customer_email: string;
          id: string;
          status: string;
          subtotal_amount_minor: number;
          tax_amount_minor: number;
          total_amount_minor: number;
          traveler_summary: TravelerSnapshot[];
        }
      | null) ?? null;

  if (!booking) {
    notFound();
  }

  const bookingItemResult = await supabase
    .from("booking_items")
    .select("id, title, description")
    .eq("booking_id", booking.id)
    .maybeSingle();
  const bookingItem =
    (bookingItemResult.data as {description: string | null; id: string; title: string} | null) ??
    null;

  if (!bookingItem) {
    notFound();
  }

  const hotelBookingResult = await supabase
    .from("hotel_bookings")
    .select("id, check_in_date, check_out_date, property_name, room_count, guest_count")
    .eq("booking_item_id", bookingItem.id)
    .maybeSingle();
  const hotelBooking =
    (hotelBookingResult.data as
      | {
          check_in_date: string;
          check_out_date: string;
          guest_count: number;
          id: string;
          property_name: string;
          room_count: number;
        }
      | null) ?? null;

  if (!hotelBooking) {
    notFound();
  }

  const roomSnapshotResult = await supabase
    .from("hotel_room_snapshots")
    .select("room_name, rate_type")
    .eq("hotel_booking_id", hotelBooking.id)
    .order("room_index", {ascending: true});
  const roomSnapshots =
    (roomSnapshotResult.data as Array<{rate_type: string; room_name: string}> | null) ?? [];

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

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("stayTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("propertyLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {hotelBooking.property_name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("stayLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {formatHotelStayDates(
                    hotelBooking.check_in_date,
                    hotelBooking.check_out_date,
                    params.locale
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("guestsLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {hotelBooking.guest_count}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("roomsLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {hotelBooking.room_count}
                </span>
              </div>
              {roomSnapshots.map((roomSnapshot, index) => (
                <div
                  key={`${roomSnapshot.room_name}-${index}`}
                  className="rounded-lg border border-border/80 bg-background/70 p-4"
                >
                  <p className="font-medium text-foreground">{roomSnapshot.room_name}</p>
                  <p className="text-muted-foreground">
                    {t(`rateTypeOptions.${roomSnapshot.rate_type}`)}
                  </p>
                </div>
              ))}
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
            <CardTitle>{t("guestSummaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {booking.traveler_summary.map((traveler, index) => (
              <div
                key={`${traveler.firstName}-${index}`}
                className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm"
              >
                <p className="font-medium text-foreground">
                  {traveler.firstName} {traveler.lastName}
                </p>
                <p className="text-muted-foreground">
                  {t(`guestTypeOptions.${traveler.guestType}`)}
                </p>
              </div>
            ))}
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
            <Link href={getLocalizedPath(ROUTES.home, params.locale)}>
              {t("homeAction")}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
