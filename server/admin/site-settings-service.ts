import "server-only";

import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

function asJson(value: unknown) {
  return value as Json;
}

async function updateGlobalSiteSetting({
  description,
  isPublic,
  key,
  value
}: {
  description: string;
  isPublic: boolean;
  key: string;
  value: unknown;
}) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("site_settings")
    .update({
      description,
      is_public: isPublic,
      setting_value: asJson(value)
    })
    .eq("setting_key", key)
    .is("locale", null)
    .select("setting_value");

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.[0]?.setting_value ?? null;
}

export async function saveGlobalSiteSetting({
  description,
  isPublic = false,
  key,
  value
}: {
  description: string;
  isPublic?: boolean;
  key: string;
  value: unknown;
}) {
  const updatedValue = await updateGlobalSiteSetting({
    description,
    isPublic,
    key,
    value
  });

  if (updatedValue !== null) {
    return updatedValue;
  }

  const admin = createSupabaseAdminClient();
  const insertResult = await admin
    .from("site_settings")
    .insert({
      description,
      is_public: isPublic,
      locale: null,
      setting_key: key,
      setting_value: asJson(value)
    })
    .select("setting_value")
    .single();

  if (!insertResult.error) {
    return insertResult.data?.setting_value ?? null;
  }

  if (insertResult.error.code === "23505") {
    const retriedValue = await updateGlobalSiteSetting({
      description,
      isPublic,
      key,
      value
    });

    if (retriedValue !== null) {
      return retriedValue;
    }
  }

  throw new Error(insertResult.error.message);
}
