"use client";

import {createBrowserClient} from "@supabase/ssr";

import {ADMIN_AUTH_COOKIE_NAME} from "@/lib/auth/admin-auth-config";
import {getSupabasePublicConfig} from "@/lib/env/client";
import {type Database} from "@/types/supabase";

export function createAdminSupabaseBrowserClient() {
  const {key, url} = getSupabasePublicConfig();

  return createBrowserClient<Database>(url, key, {
    cookieOptions: {
      name: ADMIN_AUTH_COOKIE_NAME
    },
    isSingleton: false
  });
}
