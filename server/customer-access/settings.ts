import "server-only";

import {type AdminAccessSettings} from "@/features/admin/lib/control-center-types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

export const CUSTOMER_ACCESS_SETTINGS_KEY = "admin_site_settings_access";

export function getDefaultCustomerAccessSettings(): AdminAccessSettings {
  return {
    customerLoginRequiresEmailConfirmation: false,
    customerLoginRequiresSmsConfirmation: false,
    guestCheckoutEnabled: true
  };
}

function asRecord(value: Json | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeCustomerAccessSettings(value: Json | null | undefined): AdminAccessSettings {
  const defaults = getDefaultCustomerAccessSettings();
  const record = asRecord(value);

  return {
    customerLoginRequiresEmailConfirmation: asBoolean(
      record.customerLoginRequiresEmailConfirmation,
      defaults.customerLoginRequiresEmailConfirmation
    ),
    customerLoginRequiresSmsConfirmation: asBoolean(
      record.customerLoginRequiresSmsConfirmation,
      defaults.customerLoginRequiresSmsConfirmation
    ),
    guestCheckoutEnabled: asBoolean(
      record.guestCheckoutEnabled,
      defaults.guestCheckoutEnabled
    )
  };
}

export async function getCustomerAccessSettings(): Promise<AdminAccessSettings> {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", CUSTOMER_ACCESS_SETTINGS_KEY)
    .is("locale", null)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return normalizeCustomerAccessSettings(
    (result.data as {setting_value: Json} | null)?.setting_value
  );
}

function getUserPhoneConfirmedAt(user: {phone_confirmed_at?: string | null}) {
  return typeof user.phone_confirmed_at === "string" ? user.phone_confirmed_at : null;
}

export async function syncCustomerAuthConfirmationForSettings({
  settings,
  userId
}: {
  settings?: AdminAccessSettings;
  userId: string;
}) {
  const accessSettings = settings ?? await getCustomerAccessSettings();
  const admin = createSupabaseAdminClient();
  const userResult = await admin.auth.admin.getUserById(userId);

  if (userResult.error || !userResult.data.user) {
    throw new Error(userResult.error?.message ?? "User not found.");
  }

  const user = userResult.data.user;
  const update: {
    email_confirm?: boolean;
    phone_confirm?: boolean;
  } = {};

  if (!accessSettings.customerLoginRequiresEmailConfirmation && !user.email_confirmed_at) {
    update.email_confirm = true;
  }

  if (
    !accessSettings.customerLoginRequiresSmsConfirmation &&
    user.phone &&
    !getUserPhoneConfirmedAt(user)
  ) {
    update.phone_confirm = true;
  }

  if (Object.keys(update).length > 0) {
    const updateResult = await admin.auth.admin.updateUserById(userId, update);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  if (update.email_confirm) {
    const profileResult = await admin
      .from("profiles")
      .update({
        email_verified_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }
  }
}
