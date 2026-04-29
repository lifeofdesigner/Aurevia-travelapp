import {ArrowRight, LockKeyhole} from "lucide-react";
import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {CarBookingFlow} from "@/features/cars/components/car-booking-flow";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getCachedCarOffer} from "@/server/cars/offer-service";

type CarBookingPageProps = {
  params: {
    locale: Locale;
    offerId: string;
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

export default async function CarBookingPage({
  params,
  searchParams
}: CarBookingPageProps) {
  const t = await getTranslations({locale: params.locale, namespace: "Cars.booking"});
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  const offer = await getCachedCarOffer(params.offerId);

  if (!offer) {
    notFound();
  }

  if (!user) {
    const searchLogId = getSearchValue(searchParams, "searchLogId");
    const nextPath =
      searchLogId && typeof searchLogId === "string"
        ? `/${params.locale}/cars/${params.offerId}/book?searchLogId=${searchLogId}`
        : `/${params.locale}/cars/${params.offerId}/book`;

    return (
      <main id="main-content" className="aurevia-section">
        <Card className="mx-auto max-w-2xl border-border/80 bg-card/92 shadow-soft">
          <CardHeader className="space-y-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LockKeyhole aria-hidden="true" className="h-5 w-5" />
            </div>
            <CardTitle className="font-display text-3xl">{t("signInTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-muted-foreground">{t("signInBody")}</p>
            <Button asChild className="rounded-lg px-6">
              <Link href={`/${params.locale}/auth?next=${encodeURIComponent(nextPath)}`}>
                {t("signInAction")}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main id="main-content" className="aurevia-section">
      <CarBookingFlow
        defaultContactEmail={user.email ?? ""}
        locale={params.locale}
        offer={offer}
        searchLogId={getSearchValue(searchParams, "searchLogId")}
      />
    </main>
  );
}
