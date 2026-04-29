import {Loader2} from "lucide-react";
import {notFound, redirect} from "next/navigation";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {verifyFlutterwaveCheckoutForOwnedBooking} from "@/server/payments/flutterwave-service";

type FlutterwaveCallbackPageProps = {
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

export default async function FlutterwaveCallbackPage({
  params,
  searchParams
}: FlutterwaveCallbackPageProps) {
  const transactionId = getSearchValue(searchParams, "transaction_id");
  const checkoutReference = getSearchValue(searchParams, "tx_ref");
  const status = getSearchValue(searchParams, "status");

  if (!transactionId || !checkoutReference) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/flutterwave/callback?transaction_id=${transactionId}&tx_ref=${checkoutReference}&status=${status ?? ""}`)}`
    );
  }

  const result = await verifyFlutterwaveCheckoutForOwnedBooking({
    checkoutReference,
    transactionId,
    userId: user.id
  });

  if (result.status === "successful") {
    redirect(
      `/${params.locale}/payments/success?session_id=${encodeURIComponent(checkoutReference)}`
    );
  }

  return (
    <main id="main-content" className="aurevia-section">
      <Card className="mx-auto max-w-2xl border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin" />
          </div>
          <CardTitle className="font-display text-4xl tracking-[0.01em]">
            Payment processing
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    </main>
  );
}
