import {CircleCheckBig} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound, redirect} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {
  getOwnedCheckoutCompletionSummary,
  synchronizeStripeCheckoutSessionForUser
} from "@/server/payments/checkout-service";

type PaymentSuccessPageProps = {
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

export default async function PaymentSuccessPage({
  params,
  searchParams
}: PaymentSuccessPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Payments.success"});
  const sessionId = getSearchValue(searchParams, "session_id");

  if (!sessionId) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/success?session_id=${sessionId}`)}`
    );
  }

  try {
    await synchronizeStripeCheckoutSessionForUser({
      providerSessionId: sessionId,
      userId: user.id
    });
  } catch {
    // The webhook may still complete the booking if a direct Stripe status check fails.
  }

  const result = await getOwnedCheckoutCompletionSummary({
    providerSessionId: sessionId,
    userId: user.id
  });

  if (!result) {
    notFound();
  }

  const {booking, receipt} = result;
  const invoiceHref = receipt?.invoiceId ? `/api/invoices/${receipt.invoiceId}/pdf` : null;
  const isConfirmed = booking.status === "confirmed" && booking.paymentStatus === "paid";

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
                {isConfirmed ? t("title") : t("processingTitle")}
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {isConfirmed
                  ? t("body", {reference: booking.bookingReference})
                  : t("processingBody")}
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("referenceLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {booking.bookingReference}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("statusLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {t(`statusOptions.${booking.paymentStatus}`)}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("totalLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatMoney(
                  {
                    amountMinor: booking.totalAmountMinor,
                    currency: booking.currency
                  },
                  params.locale
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("invoiceTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("invoiceNumberLabel")}</span>
              <span className="font-medium text-foreground">
                {receipt?.invoiceNumber ?? t("invoicePending")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("invoiceStatusLabel")}</span>
              <span className="font-medium text-foreground">
                {booking.invoiceStatus ? t(`invoiceStatusOptions.${booking.invoiceStatus}`) : t("invoicePending")}
              </span>
            </div>
            {invoiceHref ? (
              <Button asChild className="rounded-lg px-6">
                <Link href={invoiceHref}>{t("invoiceAction")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
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
