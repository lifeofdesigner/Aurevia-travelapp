import {CircleCheckBig} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  formatTourDateTime,
  formatTourDuration
} from "@/features/tours/lib/formatters";
import {type TourAddOn, type TourAvailabilitySlot} from "@/features/tours/types";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney, type SupportedCurrency} from "@/lib/money";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {type Json} from "@/types/supabase";

type TourBookingConfirmationPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

type TourBookingMetadata = {
  leadTraveler?: {
    firstName: string;
    lastName: string;
  };
  participantCounts?: {
    adults: number;
    children: number;
  };
};

type TourSnapshotPayload = {
  selectedAddOns?: TourAddOn[];
  selectedSlot?: TourAvailabilitySlot;
  specialRequests?: string | null;
};

type TourBookingRow = {
  booking_reference: string;
  currency_code: SupportedCurrency;
  customer_email: string;
  id: string;
  metadata: Json;
  status: string;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  total_amount_minor: number;
};

export default async function TourBookingConfirmationPage({
  params
}: TourBookingConfirmationPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Tours.confirmation"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();

  if (!userResult.data.user) {
    notFound();
  }

  const bookingResult = await supabase
    .from("bookings")
    .select("id, booking_reference, currency_code, customer_email, status, subtotal_amount_minor, tax_amount_minor, total_amount_minor, metadata")
    .eq("id", params.bookingId)
    .maybeSingle();
  const booking = (bookingResult.data as TourBookingRow | null) ?? null;

  if (!booking) {
    notFound();
  }

  const bookingItemResult = await supabase
    .from("booking_items")
    .select("id, title, snapshot_payload")
    .eq("booking_id", booking.id)
    .maybeSingle();
  const bookingItem =
    (bookingItemResult.data as
      | {id: string; snapshot_payload: Json; title: string}
      | null) ?? null;

  if (!bookingItem) {
    notFound();
  }

  const tourBookingResult = await supabase
    .from("tour_bookings")
    .select("title, service_date, starts_at, duration_minutes, meeting_point, ticket_delivery_method, cancellation_policy")
    .eq("booking_item_id", bookingItem.id)
    .maybeSingle();
  const tourBooking =
    (tourBookingResult.data as
      | {
          cancellation_policy: Json;
          duration_minutes: number;
          meeting_point: string;
          service_date: string;
          starts_at: string;
          ticket_delivery_method: string;
          title: string;
        }
      | null) ?? null;

  if (!tourBooking) {
    notFound();
  }

  const metadata = (booking.metadata as TourBookingMetadata | null) ?? null;
  const snapshot = (bookingItem.snapshot_payload as TourSnapshotPayload | null) ?? null;
  const participantCounts = metadata?.participantCounts ?? {adults: 0, children: 0};
  const selectedAddOns = snapshot?.selectedAddOns ?? [];
  const selectedSlot = snapshot?.selectedSlot;

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
              <p className="mt-2 text-sm font-medium text-foreground">{booking.customer_email}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("activityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("experienceLabel")}</span>
                <span className="text-right font-medium text-foreground">{tourBooking.title}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dateLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {tourBooking.service_date}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("slotLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {selectedSlot ? formatTourDateTime(selectedSlot.startsAt, params.locale) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("durationLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {formatTourDuration(tourBooking.duration_minutes)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("meetingPointLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {tourBooking.meeting_point}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("participantsLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {t("participantMixValue", {
                    adults: participantCounts.adults,
                    children: participantCounts.children
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("ticketDeliveryLabel")}</span>
                <span className="text-right font-medium text-foreground">
                  {tourBooking.ticket_delivery_method}
                </span>
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
                      currency: booking.currency_code
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
                      currency: booking.currency_code
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
                      currency: booking.currency_code
                    },
                    params.locale
                  )}
                </span>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{t("pendingBody")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("leadTravelerTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium text-foreground">
                {metadata?.leadTraveler?.firstName} {metadata?.leadTraveler?.lastName}
              </p>
              {snapshot?.specialRequests ? (
                <p className="leading-7 text-muted-foreground">{snapshot.specialRequests}</p>
              ) : (
                <p className="leading-7 text-muted-foreground">{t("noSpecialRequests")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>{t("addOnsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedAddOns.length > 0 ? (
                selectedAddOns.map((addOn) => (
                  <div
                    key={addOn.code}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{addOn.title}</p>
                      <p className="text-muted-foreground">{addOn.description}</p>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatMoney(addOn.totalAmount, params.locale)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="leading-7 text-muted-foreground">{t("noAddOns")}</p>
              )}
            </CardContent>
          </Card>
        </div>

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
