import {notFound, redirect} from "next/navigation";

import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {PaystackCallbackStatus} from "@/features/payments/components/paystack-callback-status";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

type PaystackCallbackPageProps = {
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

export default async function PaystackCallbackPage({
  params,
  searchParams
}: PaystackCallbackPageProps) {
  const reference = getSearchValue(searchParams, "reference");

  if (!reference) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(
      `/${params.locale}/auth?next=${encodeURIComponent(`/${params.locale}/payments/paystack/callback?reference=${reference}`)}`
    );
  }

  const checkoutResult = await createSupabaseAdminClient()
    .from("checkout_sessions")
    .select("booking_id")
    .eq("provider_session_id", reference)
    .eq("provider", "paystack")
    .eq("user_id", user.id)
    .maybeSingle();
  const bookingId =
    ((checkoutResult.data as {booking_id: string} | null) ?? null)?.booking_id ?? null;

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-2xl">
        <PaystackCallbackStatus
          bookingId={bookingId}
          locale={params.locale}
          reference={reference}
        />
      </div>
    </main>
  );
}
