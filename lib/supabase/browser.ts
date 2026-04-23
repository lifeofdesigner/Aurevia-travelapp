"use client";

import {createBrowserClient} from "@supabase/ssr";

import {assertSupabasePublicEnv, getPublicEnv} from "@/lib/env/client";
import {type Database} from "@/types/supabase";

export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  assertSupabasePublicEnv(env);

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
