import {type NextRequest, NextResponse} from "next/server";

import {defaultLocale, isSupportedLocale, type Locale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {completeDevelopmentCheckoutSession} from "@/server/payments/checkout-service";

function readLocale(value: string | null): Locale {
  return value && isSupportedLocale(value) ? value : defaultLocale;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locale = readLocale(requestUrl.searchParams.get("locale"));
  const providerSessionId = requestUrl.searchParams.get("session_id");

  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEV_CHECKOUT !== "true"
  ) {
    return NextResponse.json(
      {
        message: "Development checkout confirmation is disabled."
      },
      {status: 404}
    );
  }

  if (!providerSessionId) {
    return NextResponse.json(
      {
        message: "Missing development checkout session."
      },
      {status: 400}
    );
  }

  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return NextResponse.redirect(
      new URL(
        `/${locale}/auth?next=${encodeURIComponent(`/api/payments/dev/confirm?session_id=${providerSessionId}&locale=${locale}`)}`,
        request.url
      )
    );
  }

  await completeDevelopmentCheckoutSession({
    locale,
    providerSessionId,
    userId: user.id
  });

  return NextResponse.redirect(
    new URL(
      `/${locale}/payments/success?session_id=${encodeURIComponent(providerSessionId)}`,
      request.url
    )
  );
}
