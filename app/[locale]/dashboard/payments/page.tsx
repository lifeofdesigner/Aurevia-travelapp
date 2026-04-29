import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {CurrencyAmount} from "@/lib/currency/use-currency";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {listPaymentsAndInvoicesForUser} from "@/server/account/dashboard-service";

type PaymentsPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function PaymentsPage({params}: PaymentsPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/payments`
  );
  const [t, paymentHistory] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Dashboard.payments"}),
    listPaymentsAndInvoicesForUser(user.id)
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{t("paymentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentHistory.payments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                {t("paymentsEmpty")}
              </div>
            ) : (
              paymentHistory.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-border/80 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        {payment.bookingReference ?? payment.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(payment.createdAt, params.locale)}
                      </p>
                      {payment.invoiceNumber ? (
                        <p className="text-sm text-muted-foreground">
                          {t("invoiceValue", {invoiceNumber: payment.invoiceNumber})}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      label={t(`paymentStatus.${payment.status}`)}
                      status={payment.status}
                    />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("capturedLabel")}
                      </p>
                      <CurrencyAmount
                        amountMinor={payment.amountCapturedMinor}
                        className="mt-2 block font-semibold text-foreground"
                        fromCurrency={payment.currency}
                        locale={params.locale}
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("refundedLabel")}
                      </p>
                      <CurrencyAmount
                        amountMinor={payment.amountRefundedMinor}
                        className="mt-2 block font-semibold text-foreground"
                        fromCurrency={payment.currency}
                        locale={params.locale}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{t("invoicesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentHistory.invoices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                {t("invoicesEmpty")}
              </div>
            ) : (
              paymentHistory.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-lg border border-border/80 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.bookingReference ?? t("invoiceWithoutBooking")}
                      </p>
                    </div>
                    <StatusBadge
                      label={t(`invoiceStatus.${invoice.status}`)}
                      status={invoice.status}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("totalLabel")}
                      </p>
                      <CurrencyAmount
                        amountMinor={invoice.totalAmountMinor}
                        className="mt-2 block font-semibold text-foreground"
                        fromCurrency={invoice.currency}
                        locale={params.locale}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invoice.bookingId ? (
                        <Link
                          href={`/${params.locale}/dashboard/bookings/${invoice.bookingId}`}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t("viewBookingAction")}
                        </Link>
                      ) : null}
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {t("downloadInvoiceAction")}
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
