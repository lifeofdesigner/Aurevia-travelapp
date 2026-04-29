import "server-only";

import {createSupabaseServerClient} from "@/lib/supabase/server";
import {type HeaderAccount} from "@/components/shared/layout/header-account-types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

function getDisplayName({
  email,
  firstName,
  fullName,
  lastName
}: {
  email: string;
  firstName?: string | null;
  fullName?: string | null;
  lastName?: string | null;
}) {
  const profileName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return profileName || fullName?.trim() || email;
}

export async function getHeaderAccount(): Promise<HeaderAccount | null> {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user?.id || !user.email) {
      return null;
    }

    const admin = createSupabaseAdminClient();
    const profileResult = await admin
      .from("profiles")
      .select("email, first_name, last_name, role")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    const profile =
      (profileResult.data as
        | {
            email: string;
            first_name: string | null;
            last_name: string | null;
            role: string | null;
          }
        | null) ?? null;
    const metadata = user.user_metadata as {full_name?: string | null} | null;
    const email = profile?.email || user.email;

    return {
      displayName: getDisplayName({
        email,
        firstName: profile?.first_name,
        fullName: metadata?.full_name,
        lastName: profile?.last_name
      }),
      email,
      role: profile?.role ?? null
    };
  } catch {
    return null;
  }
}
