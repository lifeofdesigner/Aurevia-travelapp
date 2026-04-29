import "server-only";

import {randomUUID} from "node:crypto";
import {type SupabaseClient} from "@supabase/supabase-js";

import {type Database} from "@/types/supabase";
import {
  getCustomerAccessSettings,
  syncCustomerAuthConfirmationForSettings
} from "@/server/customer-access/settings";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

function buildGuestPassword() {
  return `${randomUUID()}Guest!${Date.now()}`;
}

function buildGuestEmail(contactEmail: string) {
  const normalized = contactEmail.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `guest-${normalized || "customer"}-${randomUUID()}@guest.aurevia.local`;
}

export async function resolveBookingCustomerUserId({
  contactEmail,
  contactPhone,
  existingUserId,
  supabase
}: {
  contactEmail: string;
  contactPhone?: string | null;
  existingUserId?: string | null;
  supabase: SupabaseClient<Database>;
}) {
  if (existingUserId) {
    return existingUserId;
  }

  const settings = await getCustomerAccessSettings();

  if (!settings.guestCheckoutEnabled) {
    throw new Error("Sign in is required before a pending booking can be created.");
  }

  const admin = createSupabaseAdminClient();
  const password = buildGuestPassword();
  const guestEmail = buildGuestEmail(contactEmail);
  const authResult = await admin.auth.admin.createUser({
    email: guestEmail,
    email_confirm: true,
    password,
    phone: contactPhone?.trim() || undefined,
    phone_confirm: contactPhone ? !settings.customerLoginRequiresSmsConfirmation : undefined,
    user_metadata: {
      contact_email: contactEmail,
      guest_checkout: true
    }
  });

  if (authResult.error || !authResult.data.user) {
    throw new Error(authResult.error?.message ?? "Unable to create guest checkout access.");
  }

  const user = authResult.data.user;
  const profileResult = await admin.from("profiles").upsert(
    {
      email: guestEmail,
      first_name: "Guest",
      is_suspended: false,
      last_name: "Checkout",
      phone: contactPhone ?? null,
      role: "customer",
      suspended_at: null,
      user_id: user.id
    },
    {onConflict: "user_id"}
  );

  if (profileResult.error) {
    await admin.auth.admin.deleteUser(user.id);
    throw new Error(profileResult.error.message);
  }

  await syncCustomerAuthConfirmationForSettings({
    settings,
    userId: user.id
  });

  const signInResult = await supabase.auth.signInWithPassword({
    email: guestEmail,
    password
  });

  if (signInResult.error) {
    await admin.auth.admin.deleteUser(user.id);
    throw new Error(signInResult.error.message);
  }

  return user.id;
}
