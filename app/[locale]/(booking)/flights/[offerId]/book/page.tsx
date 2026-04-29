import {LockKeyhole} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {FlightBookingFlow} from "@/features/flights/components/flight-booking-flow";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getCachedFlightOffer} from "@/server/flights/offer-service";
import {type Locale} from "@/lib/i18n/routing";

type FlightBookingPageProps = {
  params: {
    locale: Locale;
    offerId: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function FlightBookingPage({
  params,
  searchParams
}: FlightBookingPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Flights"});
  const cachedOffer = await getCachedFlightOffer(params.offerId);

  if (!cachedOffer) {
    return (
      <main id="main-content" className="aurevia-section">
        <Card className="border-border/80 bg-card/92">
          <CardHeader>
            <CardTitle>{t("booking.notFoundTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{t("booking.notFoundBody")}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const searchLogId =
    typeof searchParams.searchLogId === "string" ? searchParams.searchLogId : undefined;
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    const nextPath = `/${params.locale}/flights/${params.offerId}/book${searchLogId ? `?searchLogId=${searchLogId}` : ""}`;

    return (
      <main id="main-content" className="aurevia-section">
        <Card className="mx-auto max-w-2xl border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LockKeyhole aria-hidden="true" className="h-5 w-5" />
            </div>
            <CardTitle className="font-display text-3xl">{t("booking.signInTitle")}</CardTitle>
            <p className="leading-7 text-muted-foreground">{t("booking.signInBody")}</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-lg px-6">
              <Link href={`/${params.locale}/auth?next=${encodeURIComponent(nextPath)}`}>
                {t("booking.signInAction")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const profileResponse = await supabase
    .from("profiles")
    .select("email, phone")
    .eq("user_id", user.id)
    .single();
  const profile = profileResponse.data as {email?: string | null; phone?: string | null} | null;

  return (
    <main id="main-content" className="aurevia-section">
      <FlightBookingFlow
        defaultEmail={profile?.email ?? user.email ?? ""}
        defaultPhone={profile?.phone ?? ""}
        locale={params.locale}
        offer={cachedOffer.offer}
        searchLogId={searchLogId}
      />
    </main>
  );
}
