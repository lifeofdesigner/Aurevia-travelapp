import {NextResponse} from "next/server";

import {parsePrivacyPreferencesInput} from "@/features/account/lib/privacy-schemas";
import {updateUserPrivacyPreferences} from "@/server/privacy/consent-service";
import {getPrivacyRequestContext} from "@/server/privacy/utils";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user) {
      return NextResponse.json({message: "Unauthorized."}, {status: 401});
    }

    const input = parsePrivacyPreferencesInput(await request.json());

    await updateUserPrivacyPreferences({
      context: getPrivacyRequestContext(request),
      cookiePreferences: {
        analytics: input.analyticsCookies,
        marketing: input.marketingCookies,
        necessary: true
      },
      locale: input.locale,
      marketingEmailOptIn: input.marketingEmailOptIn,
      profilingOptIn: input.profilingOptIn,
      sessionId: input.sessionId,
      userId: user.id
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update privacy preferences."
      },
      {status: 400}
    );
  }
}
