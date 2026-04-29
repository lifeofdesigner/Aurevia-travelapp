import {ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {redirect, notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {CheckoutLaunchButton} from "@/features/payments/components/checkout-launch-button";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getOwnedBookingPaymentSummary} from "@/server/payments/booking-summary";
import {getCheckoutPaymentOptions} from "@/server/payments/payment-methods";
import {buildBookingTaxLines, getDefaultVatPolicy} from "@/server/payments/tax";

type CheckoutPageProps = {
  params: {
    bookingId: string;
    locale: Locale;
  };
};

export default async function CheckoutPage({params}: CheckoutPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Payments.checkout"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/checkout/${params.bookingId}`)}`
    );
  }

  const booking = await getOwnedBookingPaymentSummary(params.bookingId, user.id);

  if (!booking) {
    notFound();
  }

  const taxLines = buildBookingTaxLines(booking);
  const taxPolicy = getDefaultVatPolicy();
  const paymentOptions = await getCheckoutPaymentOptions(booking.currency);

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="font-display text-3xl">
                    {t("bookingTitle")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("referenceValue", {reference: booking.bookingReference})}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {booking.items.map((item) => (
                <div
                  key={item.bookingItemId}
                  className="rounded-lg border border-border/80 bg-background/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 text-muted-foreground">{item.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t(`serviceTypeOptions.${item.bookingType}`)}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">
                      <CurrencyAmount
                        amountMinor={item.totalAmountMinor}
                        fromCurrency={item.currencyCode}
                        locale={params.locale}
                      />
                    </span>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-border/80 bg-background/70 p-4 leading-7 text-muted-foreground">
                {t("secureCopy")}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <CardTitle>{t("totalsTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{t("subtotalLabel")}</span>
                  <CurrencyAmount
                    amountMinor={booking.subtotalAmountMinor}
                    className="font-medium text-foreground"
                    fromCurrency={booking.currency}
                    locale={params.locale}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{t("taxLabel")}</span>
                  <CurrencyAmount
                    amountMinor={booking.taxAmountMinor}
                    className="font-medium text-foreground"
                    fromCurrency={booking.currency}
                    locale={params.locale}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                  <span className="font-semibold text-foreground">{t("totalLabel")}</span>
                  <CurrencyAmount
                    amountMinor={booking.totalAmountMinor}
                    className="font-display text-3xl text-foreground"
                    fromCurrency={booking.currency}
                    locale={params.locale}
                  />
                </div>
                <p className="leading-7 text-muted-foreground">
                  {t("taxReviewNotice", {
                    countryCode: taxPolicy.jurisdictionCountryCode
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <CardTitle>{t("taxBreakdownTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {taxLines.length > 0 ? (
                  taxLines.map((line) => (
                    <div
                      key={`${line.bookingItemId ?? "booking"}-${line.taxName}`}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <p className="font-medium text-foreground">
                        {line.taxName} | {Math.round(line.rate * 100)}%
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {t("taxableLabel")}:{" "}
                        <CurrencyAmount
                          amountMinor={line.taxableAmountMinor}
                          fromCurrency={line.currency}
                          locale={params.locale}
                        />
                      </p>
                      <p className="text-muted-foreground">
                        {t("taxAmountLabel")}:{" "}
                        <CurrencyAmount
                          amountMinor={line.taxAmountMinor}
                          fromCurrency={line.currency}
                          locale={params.locale}
                        />
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="leading-7 text-muted-foreground">{t("taxEmpty")}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <CardTitle>Payment options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentOptions.length > 0 ? (
                  paymentOptions.map((option) => (
                    <div
                      key={option.key}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            {option.tag}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-foreground">
                            {option.label}
                          </h3>
                        </div>
                        {option.environment ? (
                          <span className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {option.environment}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {option.description} Amount:{" "}
                        {formatMoney(
                          {
                            amountMinor: booking.totalAmountMinor,
                            currency: booking.currency
                          },
                          params.locale
                        )}
                      </p>
                      {option.disabledReason ? (
                        <p className="mt-3 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground">
                          {option.disabledReason}
                        </p>
                      ) : null}
                      <div className="mt-4">
                        <CheckoutLaunchButton
                          bookingId={booking.bookingId}
                          className="rounded-lg px-6"
                          disabled={Boolean(option.disabledReason)}
                          label={
                            option.key === "bank_transfer"
                              ? "Get bank transfer details"
                              : `Pay with ${option.label}`
                          }
                          locale={params.locale}
                          provider={option.key}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                    No checkout payment methods are active. Please contact support to complete this booking.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" className="rounded-lg px-6">
                <Link href={getLocalizedPath(ROUTES.dashboard, params.locale)}>
                  {t("dashboardAction")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
