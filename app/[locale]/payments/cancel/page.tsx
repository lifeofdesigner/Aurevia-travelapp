import {AlertCircle} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound, redirect} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getOwnedBookingPaymentSummary} from "@/server/payments/booking-summary";

type PaymentCancelPageProps = {
  params: {
    locale: Locale;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentCancelPage({
  params,
  searchParams
}: PaymentCancelPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Payments.cancel"});
  const bookingId = getSearchValue(searchParams, "bookingId");

  if (!bookingId) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/cancel?bookingId=${bookingId}`)}`
    );
  }

  const booking = await getOwnedBookingPaymentSummary(bookingId, user.id);

  if (!booking) {
    notFound();
  }

  return (
    <main id="main-content" className="aurevia-section">
      <Card className="mx-auto max-w-3xl border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <AlertCircle aria-hidden="true" className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {t("eyebrow")}
            </p>
            <CardTitle className="font-display text-4xl tracking-[0.01em]">
              {t("title")}
            </CardTitle>
            <p className="text-sm leading-7 text-muted-foreground">{t("body")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm">
            <p className="font-medium text-foreground">{booking.bookingReference}</p>
            <p className="mt-1 text-muted-foreground">{booking.items[0]?.title ?? "-"}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-lg px-6">
              <Link href={`/${params.locale}/checkout/${booking.bookingId}`}>{t("retryAction")}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg px-6">
              <Link href={getLocalizedPath(ROUTES.dashboard, params.locale)}>
                {t("dashboardAction")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
