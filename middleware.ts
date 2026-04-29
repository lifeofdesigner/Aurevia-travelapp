import createMiddleware from "next-intl/middleware";
import {type NextRequest, NextResponse} from "next/server";

import {ADMIN_AUTH_COOKIE_NAME} from "@/lib/auth/admin-auth-config";
import {applyBaseSecurityHeaders} from "@/lib/http/security";
import {routing} from "@/lib/i18n/routing";
import {refreshSupabaseSession} from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||
    pathname === "/setup" ||
    pathname.startsWith("/setup/")
  ) {
    const response = NextResponse.next();
    applyBaseSecurityHeaders(response.headers);
    return response;
  }

  const response = handleI18nRouting(request);
  await refreshSupabaseSession(request, response);
  await refreshSupabaseSession(request, response, ADMIN_AUTH_COOKIE_NAME);
  applyBaseSecurityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};
