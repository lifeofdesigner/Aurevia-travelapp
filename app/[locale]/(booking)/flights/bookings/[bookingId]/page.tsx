import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {redirect} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {formatMoney} from "@/lib/money";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {getOwnedFlightBookingSummary} from "@/server/flights/booking-service";
import {type Locale} from "@/lib/i18n/routing";

type FlightBookingCreatedPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

export default async function FlightBookingCreatedPage({
  params
}: FlightBookingCreatedPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Flights"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(`/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/flights/bookings/${params.bookingId}`)}`);
  }

  const booking = await getOwnedFlightBookingSummary(params.bookingId, user.id);

  if (!booking) {
    return (
      <main id="main-content" className="aurevia-section">
        <Card className="border-border/80 bg-card/92">
          <CardHeader>
            <CardTitle>{t("confirmation.notFoundTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{t("confirmation.notFoundBody")}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main id="main-content" className="aurevia-section">
      <Card className="mx-auto max-w-3xl border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            {t("confirmation.eyebrow")}
          </p>
          <CardTitle className="font-display text-4xl">{t("confirmation.title")}</CardTitle>
          <p className="leading-7 text-muted-foreground">{t("confirmation.lead")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">{t("confirmation.referenceLabel")}</p>
              <p className="mt-2 font-semibold text-foreground">{booking.bookingReference}</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">{t("confirmation.statusLabel")}</p>
              <p className="mt-2 font-semibold text-foreground">
                {booking.status === "pending_payment"
                  ? t("confirmation.statusPending")
                  : booking.status}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">{t("confirmation.totalLabel")}</p>
              <p className="mt-2 font-semibold text-foreground">
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
          <div className="rounded-lg border border-border/80 bg-background/70 p-4">
            <p className="font-semibold text-foreground">{booking.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {booking.description ?? t("confirmation.descriptionFallback")}
            </p>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            {t("confirmation.pendingBody")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-lg px-6">
              <a
                href={`/api/bookings/${booking.bookingId}/ticket?locale=${params.locale}`}
                target="_blank"
              >
                Download E-Ticket
              </a>
            </Button>
            <Button asChild className="rounded-lg px-6">
              <Link href={`/${params.locale}/checkout/${booking.bookingId}`}>
                {t("confirmation.paymentAction")}
              </Link>
            </Button>
            <Button asChild className="rounded-lg px-6">
              <Link href={getLocalizedPath(ROUTES.dashboard, params.locale)}>
                {t("confirmation.dashboardAction")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg px-6">
              <Link href={getLocalizedPath(ROUTES.home, params.locale)}>
                {t("confirmation.homeAction")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
