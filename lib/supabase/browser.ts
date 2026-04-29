"use client";

import {createBrowserClient} from "@supabase/ssr";

import {getSupabasePublicConfig} from "@/lib/env/client";
import {type Database} from "@/types/supabase";

export function createSupabaseBrowserClient() {
  const {key, url} = getSupabasePublicConfig();

  return createBrowserClient<Database>(url, key);
}
