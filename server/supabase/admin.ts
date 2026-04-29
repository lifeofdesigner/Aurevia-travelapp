import "server-only";

import {createClient} from "@supabase/supabase-js";

import {getSupabasePublicConfig} from "@/lib/env/client";
import {getServerEnv, requireServerEnv} from "@/lib/env/server";
import {type Database} from "@/types/supabase";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  const {url} = getSupabasePublicConfig(env);
  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
