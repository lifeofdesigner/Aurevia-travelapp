import {CreditCard} from "lucide-react";
import Link from "next/link";
import {notFound, redirect} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {KorapayCheckoutClient} from "@/features/payments/components/korapay-checkout-client";
import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getOwnedKorapayCheckout} from "@/server/payments/korapay-service";

type KorapayCheckoutPageProps = {
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

function getCustomerName(travelers: Record<string, unknown>[], fallback: string) {
  const firstTraveler = travelers[0];
  const firstName = typeof firstTraveler?.firstName === "string" ? firstTraveler.firstName : "";
  const lastName = typeof firstTraveler?.lastName === "string" ? firstTraveler.lastName : "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  return name || fallback;
}

export default async function KorapayCheckoutPage({
  params,
  searchParams
}: KorapayCheckoutPageProps) {
  const reference = getSearchValue(searchParams, "reference");

  if (!reference) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/korapay/checkout?reference=${reference}`)}`
    );
  }

  const checkout = await getOwnedKorapayCheckout({
    reference,
    userId: user.id
  });

  if (!checkout) {
    notFound();
  }

  const customerName = getCustomerName(
    checkout.booking.travelerSummary,
    checkout.booking.customerEmail
  );
  const notificationUrl = new URL(
    "/api/payments/korapay/webhook",
    getPublicEnv().NEXT_PUBLIC_APP_URL
  ).toString();

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CreditCard aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Korapay
              </p>
              <CardTitle className="font-display text-4xl tracking-[0.01em]">
                Secure Checkout
              </CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">
                The Korapay checkout window should open automatically. If it closes, use the button below to reopen it.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Booking
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {checkout.booking.bookingReference}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Total
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {formatMoney(
                    {
                      amountMinor: checkout.booking.totalAmountMinor,
                      currency: checkout.booking.currency
                    },
                    params.locale
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Reference
                </p>
                <p className="mt-2 break-all font-medium text-foreground">
                  {checkout.checkout.reference}
                </p>
              </div>
            </div>

            <KorapayCheckoutClient
              amount={checkout.amount}
              bookingId={checkout.booking.bookingId}
              currency={checkout.booking.currency}
              customerEmail={checkout.booking.customerEmail}
              customerName={customerName}
              locale={params.locale}
              notificationUrl={notificationUrl}
              publicKey={checkout.publicKey}
              reference={checkout.checkout.reference}
            />
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="rounded-lg px-6">
          <Link href={`/${params.locale}/checkout/${checkout.booking.bookingId}`}>
            Back to checkout
          </Link>
        </Button>
      </div>
    </main>
  );
}
