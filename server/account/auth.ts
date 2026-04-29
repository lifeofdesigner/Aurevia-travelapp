import "server-only";

import {type User} from "@supabase/supabase-js";
import {redirect} from "next/navigation";

import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function requireAuthenticatedUser(
  locale: Locale,
  nextPath: string
): Promise<User> {
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    redirect(`/${locale}/auth?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
