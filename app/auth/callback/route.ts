import {type NextRequest, NextResponse} from "next/server";

import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getPublicEnv} from "@/lib/env/client";
import {defaultLocale, isSupportedLocale, type Locale} from "@/lib/i18n/routing";
import {sendWelcomeEmail} from "@/server/email/transactional";
import {reportServerError} from "@/server/observability/logger";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

function getLocaleFromNextPath(nextPath: string) {
  const candidate = nextPath.split("/").filter(Boolean)[0];

  return isSupportedLocale(candidate) ? candidate : defaultLocale;
}

async function runPostLoginTasks(userId: string, fallbackLocale: Locale) {
  const admin = createSupabaseAdminClient();
  const authUserResult = await admin.auth.admin.getUserById(userId);
  const authUser = authUserResult.data.user;

  if (!authUser) {
    return;
  }

  const profileResult = await admin
    .from("profiles")
    .select("email, first_name, preferred_locale")
    .eq("user_id", userId)
    .maybeSingle();
  const profile =
    (profileResult.data as
      | {
          email: string;
          first_name: string | null;
          preferred_locale: string | null;
        }
      | null) ?? null;
  const preferredLocale =
    typeof profile?.preferred_locale === "string" && isSupportedLocale(profile.preferred_locale)
      ? profile.preferred_locale
      : fallbackLocale;

  await admin
    .from("profiles")
    .update({
      email_verified_at: authUser.email_confirmed_at ?? null,
      last_signed_in_at: authUser.last_sign_in_at ?? new Date().toISOString()
    })
    .eq("user_id", userId);

  const welcomeAudit = await admin
    .from("audit_logs")
    .select("id")
    .eq("action", "account.email.welcome_sent")
    .eq("entity_type", "profile")
    .eq("entity_id", userId)
    .limit(1)
    .maybeSingle();

  if (welcomeAudit.data) {
    return;
  }

  const recipient = profile?.email ?? authUser.email ?? null;

  if (!recipient) {
    return;
  }

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  await sendWelcomeEmail({
    firstName: profile?.first_name ?? null,
    locale: preferredLocale,
    quickLinks: {
      dashboard: `${appUrl}/${preferredLocale}/dashboard`,
      flights: `${appUrl}/${preferredLocale}/flights`,
      hotels: `${appUrl}/${preferredLocale}/hotels`
    },
    to: recipient
  });

  await admin.from("audit_logs").insert({
    action: "account.email.welcome_sent",
    entity_id: userId,
    entity_type: "profile",
    metadata: {
      locale: preferredLocale
    },
    target_user_id: userId
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? `/${defaultLocale}/dashboard`;
  const locale = getLocaleFromNextPath(nextPath);

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/auth?status=missing_code`, request.url));
  }

  const supabase = createSupabaseServerClient();
  const result = await supabase.auth.exchangeCodeForSession(code);

  if (result.error) {
    return NextResponse.redirect(new URL(`/${locale}/auth?status=error`, request.url));
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (user?.id) {
    try {
      await runPostLoginTasks(user.id, locale);
    } catch (error) {
      reportServerError("auth.callback.post_login_tasks_failed", error, {
        userId: user.id
      });
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
