import "server-only";

import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";

import {getSupabasePublicConfig} from "@/lib/env/client";
import {type Database} from "@/types/supabase";

export function createSupabaseServerClient() {
  const {key, url} = getSupabasePublicConfig();
  const cookieStore = cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({name, value, options}) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware and route handlers can.
        }
      }
    }
  });
}
