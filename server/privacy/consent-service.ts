import "server-only";

import {
  buildAuthenticatedPrivacySessionId,
  normalizeCookieConsentPreferences,
  type CookieConsentPreferences,
  type LegalDocumentKey
} from "@/lib/privacy";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type ConsentStatus} from "@/types/database-enums";

import {asJsonRecord, type PrivacyRequestContext} from "./utils";

type ConsentRecordRow = {
  consent_status: ConsentStatus;
  consent_type: string;
  recorded_at: string;
};

export type PrivacyPreferenceSnapshot = {
  cookiePreferences: CookieConsentPreferences;
  marketingEmailOptIn: boolean;
  profilingOptIn: boolean;
};

function determineConsentStatus(previousStatus: ConsentStatus | undefined, granted: boolean): ConsentStatus {
  if (granted) {
    return "granted";
  }

  return previousStatus === "granted" ? "withdrawn" : "denied";
}

async function getCurrentLegalDocumentId(
  documentKey: LegalDocumentKey,
  locale: Locale
) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("legal_documents")
    .select("id")
    .eq("document_key", documentKey)
    .eq("locale", locale)
    .eq("publication_status", "published")
    .eq("is_current", true)
    .order("effective_at", {ascending: false})
    .limit(1)
    .maybeSingle();

  return (result.data as {id: string} | null)?.id ?? null;
}

async function getLatestConsentStatusMap({
  sessionId,
  table,
  types,
  userId
}: {
  sessionId: string;
  table: "cookie_consent_records" | "privacy_consent_records";
  types: string[];
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from(table)
    .select("consent_type, consent_status, recorded_at")
    .in("consent_type", types)
    .order("recorded_at", {ascending: false});

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("session_id", sessionId);
  }

  const result = await query;
  const rows = (result.data as ConsentRecordRow[] | null) ?? [];
  const map = new Map<string, ConsentStatus>();

  for (const row of rows) {
    if (!map.has(row.consent_type)) {
      map.set(row.consent_type, row.consent_status);
    }
  }

  return map;
}

export async function getPrivacyPreferenceSnapshotForUser(
  userId: string
): Promise<PrivacyPreferenceSnapshot> {
  const admin = createSupabaseAdminClient();
  const [userPreferencesResult, privacyConsentResult, cookieConsentResult] =
    await Promise.all([
      admin
        .from("user_preferences")
        .select("marketing_email_opt_in")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("privacy_consent_records")
        .select("consent_type, consent_status, recorded_at")
        .eq("user_id", userId)
        .in("consent_type", ["marketing_email", "profiling"])
        .order("recorded_at", {ascending: false}),
      admin
        .from("cookie_consent_records")
        .select("consent_type, consent_status, recorded_at")
        .eq("user_id", userId)
        .in("consent_type", ["necessary_cookies", "analytics_cookies", "marketing_cookies"])
        .order("recorded_at", {ascending: false})
    ]);

  const privacyMap = new Map<string, ConsentStatus>();
  const cookieMap = new Map<string, ConsentStatus>();

  for (const row of ((privacyConsentResult.data as ConsentRecordRow[] | null) ?? [])) {
    if (!privacyMap.has(row.consent_type)) {
      privacyMap.set(row.consent_type, row.consent_status);
    }
  }

  for (const row of ((cookieConsentResult.data as ConsentRecordRow[] | null) ?? [])) {
    if (!cookieMap.has(row.consent_type)) {
      cookieMap.set(row.consent_type, row.consent_status);
    }
  }

  return {
    cookiePreferences: {
      analytics: cookieMap.get("analytics_cookies") === "granted",
      marketing: cookieMap.get("marketing_cookies") === "granted",
      necessary: true
    },
    marketingEmailOptIn:
      ((userPreferencesResult.data as {marketing_email_opt_in?: boolean} | null)?.marketing_email_opt_in ??
        false) ||
      privacyMap.get("marketing_email") === "granted",
    profilingOptIn: privacyMap.get("profiling") === "granted"
  };
}

export async function recordCookieConsentPreferences({
  context,
  locale,
  preferences,
  sessionId,
  source,
  userId
}: {
  context?: PrivacyRequestContext;
  locale: Locale;
  preferences: Partial<CookieConsentPreferences>;
  sessionId?: string | null;
  source: "banner" | "preferences_center" | "profile_settings";
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const normalizedPreferences = normalizeCookieConsentPreferences(preferences);
  const resolvedSessionId =
    sessionId?.trim() || (userId ? buildAuthenticatedPrivacySessionId(userId) : null);

  if (!resolvedSessionId) {
    throw new Error("A privacy session is required to store cookie preferences.");
  }

  const [cookiePolicyId, latestStatusMap] = await Promise.all([
    getCurrentLegalDocumentId("cookie_policy", locale),
    getLatestConsentStatusMap({
      sessionId: resolvedSessionId,
      table: "cookie_consent_records",
      types: ["necessary_cookies", "analytics_cookies", "marketing_cookies"],
      userId
    })
  ]);

  const records = [
    {
      consent_type: "necessary_cookies",
      consent_status: "granted" satisfies ConsentStatus,
      granted: true
    },
    {
      consent_type: "analytics_cookies",
      consent_status: determineConsentStatus(
        latestStatusMap.get("analytics_cookies"),
        normalizedPreferences.analytics
      ),
      granted: normalizedPreferences.analytics
    },
    {
      consent_type: "marketing_cookies",
      consent_status: determineConsentStatus(
        latestStatusMap.get("marketing_cookies"),
        normalizedPreferences.marketing
      ),
      granted: normalizedPreferences.marketing
    }
  ];

  const insertResult = await admin.from("cookie_consent_records").insert(
    records.map((record) => ({
      consent_status: record.consent_status,
      consent_type: record.consent_type,
      ip_hash: context?.ipHash ?? null,
      legal_document_id: cookiePolicyId,
      locale,
      metadata: asJsonRecord({
        categories: normalizedPreferences,
        granted: record.granted,
        source
      }),
      session_id: resolvedSessionId,
      user_agent: context?.userAgent ?? null,
      user_id: userId ?? null
    }))
  );

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

export async function syncMarketingEmailConsent({
  granted,
  locale,
  source,
  userId
}: {
  granted: boolean;
  locale: Locale;
  source: "preferences_center" | "profile_settings";
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const sessionId = buildAuthenticatedPrivacySessionId(userId);
  const [privacyPolicyId, latestStatusMap] = await Promise.all([
    getCurrentLegalDocumentId("privacy_policy", locale),
    getLatestConsentStatusMap({
      sessionId,
      table: "privacy_consent_records",
      types: ["marketing_email"],
      userId
    })
  ]);
  const consentStatus = determineConsentStatus(
    latestStatusMap.get("marketing_email"),
    granted
  );

  const insertResult = await admin.from("privacy_consent_records").insert({
    consent_status: consentStatus,
    consent_type: "marketing_email",
    legal_document_id: privacyPolicyId,
    locale,
    metadata: asJsonRecord({granted, source}),
    session_id: sessionId,
    user_id: userId
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

export async function updateUserPrivacyPreferences({
  context,
  cookiePreferences,
  locale,
  marketingEmailOptIn,
  profilingOptIn,
  sessionId,
  userId
}: {
  context?: PrivacyRequestContext;
  cookiePreferences: Partial<CookieConsentPreferences>;
  locale: Locale;
  marketingEmailOptIn: boolean;
  profilingOptIn: boolean;
  sessionId?: string | null;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const resolvedSessionId =
    sessionId?.trim() || buildAuthenticatedPrivacySessionId(userId);
  const [privacyPolicyId, latestStatusMap] = await Promise.all([
    getCurrentLegalDocumentId("privacy_policy", locale),
    getLatestConsentStatusMap({
      sessionId: resolvedSessionId,
      table: "privacy_consent_records",
      types: ["marketing_email", "profiling"],
      userId
    })
  ]);

  const preferencesUpdate = await admin
    .from("user_preferences")
    .update({marketing_email_opt_in: marketingEmailOptIn})
    .eq("user_id", userId);

  if (preferencesUpdate.error) {
    throw new Error(preferencesUpdate.error.message);
  }

  const insertResult = await admin.from("privacy_consent_records").insert([
    {
      consent_status: determineConsentStatus(
        latestStatusMap.get("marketing_email"),
        marketingEmailOptIn
      ),
      consent_type: "marketing_email",
      ip_hash: context?.ipHash ?? null,
      legal_document_id: privacyPolicyId,
      locale,
      metadata: asJsonRecord({
        granted: marketingEmailOptIn,
        source: "preferences_center"
      }),
      session_id: resolvedSessionId,
      user_agent: context?.userAgent ?? null,
      user_id: userId
    },
    {
      consent_status: determineConsentStatus(
        latestStatusMap.get("profiling"),
        profilingOptIn
      ),
      consent_type: "profiling",
      ip_hash: context?.ipHash ?? null,
      legal_document_id: privacyPolicyId,
      locale,
      metadata: asJsonRecord({
        granted: profilingOptIn,
        source: "preferences_center"
      }),
      session_id: resolvedSessionId,
      user_agent: context?.userAgent ?? null,
      user_id: userId
    }
  ]);

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  await recordCookieConsentPreferences({
    context,
    locale,
    preferences: cookiePreferences,
    sessionId: resolvedSessionId,
    source: "preferences_center",
    userId
  });
}
