import "server-only";

import {createClient} from "@supabase/supabase-js";

import {assertSupabasePublicEnv} from "@/lib/env/client";
import {getServerEnv, requireServerEnv} from "@/lib/env/server";
import {type Database} from "@/types/supabase";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  assertSupabasePublicEnv(env);
  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
