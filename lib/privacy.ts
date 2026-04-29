export const COOKIE_CONSENT_STORAGE_KEY = "aurevia-cookie-consent-v1";
export const PRIVACY_SESSION_STORAGE_KEY = "aurevia-privacy-session-v1";
export const AUTHENTICATED_PRIVACY_SESSION_PREFIX = "authenticated";

export const LEGAL_DOCUMENT_KEYS = [
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "refund_policy"
] as const;

export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number];

export const COOKIE_CONSENT_CATEGORIES = [
  "necessary",
  "analytics",
  "marketing"
] as const;

export type CookieConsentCategory = (typeof COOKIE_CONSENT_CATEGORIES)[number];

export type CookieConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
  necessary: true;
};

export type StoredCookieConsent = {
  categories: CookieConsentPreferences;
  locale: string;
  savedAt: string;
  sessionId: string;
  version: 1;
};

export const DEFAULT_COOKIE_CONSENT_PREFERENCES: CookieConsentPreferences = {
  analytics: false,
  marketing: false,
  necessary: true
};

export function normalizeCookieConsentPreferences(
  input?: Partial<Record<CookieConsentCategory, boolean>> | null
): CookieConsentPreferences {
  return {
    analytics: Boolean(input?.analytics),
    marketing: Boolean(input?.marketing),
    necessary: true
  };
}

export function buildAuthenticatedPrivacySessionId(userId: string) {
  return `${AUTHENTICATED_PRIVACY_SESSION_PREFIX}:${userId}`;
}

export type LegalDocumentSummaryRecord = {
  documentKey: LegalDocumentKey;
  effectiveAt: string | null;
  title: string;
  version: string | null;
};
