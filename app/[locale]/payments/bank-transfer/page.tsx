import {Landmark} from "lucide-react";
import Link from "next/link";
import {notFound, redirect} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getOwnedBankTransferInstructions} from "@/server/payments/bank-transfer-service";

type BankTransferPageProps = {
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

export default async function BankTransferPage({
  params,
  searchParams
}: BankTransferPageProps) {
  const sessionId = getSearchValue(searchParams, "session_id");

  if (!sessionId) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/bank-transfer?session_id=${sessionId}`)}`
    );
  }

  const instructions = await getOwnedBankTransferInstructions({
    providerSessionId: sessionId,
    userId: user.id
  });

  if (!instructions) {
    notFound();
  }

  const {bankTransferDetails, booking, checkout} = instructions;

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Bank transfer
              </p>
              <CardTitle className="font-display text-4xl tracking-[0.01em]">
                Transfer Instructions
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Send the total amount using the reference below. Your booking remains pending until an admin confirms the received transfer.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Booking
                </p>
                <p className="mt-2 font-medium text-foreground">{booking.bookingReference}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Amount
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {formatMoney(
                    {amountMinor: booking.totalAmountMinor, currency: booking.currency},
                    params.locale
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Reference
                </p>
                <p className="mt-2 break-all font-medium text-foreground">{checkout.reference}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Bank details
              </p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">
                {bankTransferDetails}
              </pre>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-4 text-muted-foreground">
              Status: {checkout.status.replaceAll("_", " ")}. Expires:{" "}
              {new Date(checkout.expiresAt).toLocaleString(params.locale)}.
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="rounded-lg px-6">
            <Link href={getLocalizedPath(ROUTES.dashboard, params.locale)}>
              Go to dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-lg px-6">
            <Link href={`/${params.locale}/checkout/${booking.bookingId}`}>
              Back to checkout
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
