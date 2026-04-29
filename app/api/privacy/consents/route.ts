import {NextResponse} from "next/server";

import {parseCookieConsentInput} from "@/features/account/lib/privacy-schemas";
import {recordCookieConsentPreferences} from "@/server/privacy/consent-service";
import {getPrivacyRequestContext} from "@/server/privacy/utils";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    const input = parseCookieConsentInput(await request.json());

    await recordCookieConsentPreferences({
      context: getPrivacyRequestContext(request),
      locale: input.locale,
      preferences: {
        analytics: input.analyticsCookies,
        marketing: input.marketingCookies,
        necessary: true
      },
      sessionId: input.sessionId,
      source: "banner",
      userId: user?.id ?? null
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to save cookie preferences."
      },
      {status: 400}
    );
  }
}
