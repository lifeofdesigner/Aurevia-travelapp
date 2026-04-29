import "server-only";

import {getTranslations} from "next-intl/server";

import {getPublicEnv} from "@/lib/env/client";
import {type Locale} from "@/lib/i18n/routing";
import {
  LEGAL_DOCUMENT_KEYS,
  type LegalDocumentKey,
  type LegalDocumentSummaryRecord
} from "@/lib/privacy";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export type {LegalDocumentKey};

type LegalNamespace =
  | "Legal.privacy"
  | "Legal.terms"
  | "Legal.cookies"
  | "Legal.refunds";

type LegalDocumentRow = {
  body_markdown: string;
  checksum_sha256: string | null;
  document_key: LegalDocumentKey;
  effective_at: string;
  id: string;
  locale: Locale;
  publication_status: "archived" | "draft" | "published";
  published_at: string | null;
  summary: string | null;
  title: string;
  version: string;
};

export type LegalDocumentContent = {
  body: string;
  checksum: string | null;
  documentKey: LegalDocumentKey;
  effectiveAt: string | null;
  effectiveLabel: string;
  eyebrow: string;
  id: string | null;
  intro: string;
  pendingEffectiveValue: string;
  previewValue: string;
  publishedAt: string | null;
  reviewNotice: string;
  source: "database" | "fallback";
  title: string;
  version: string | null;
  versionLabel: string;
};

function hasSupabasePublicConfig() {
  const env = getPublicEnv();

  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export async function getLegalDocumentContent({
  documentKey,
  locale,
  namespace
}: {
  documentKey: LegalDocumentKey;
  locale: Locale;
  namespace: LegalNamespace;
}): Promise<LegalDocumentContent> {
  const t = await getTranslations({locale, namespace});
  const fallback: LegalDocumentContent = {
    body: t("body"),
    checksum: null,
    documentKey,
    effectiveAt: null,
    effectiveLabel: t("effectiveLabel"),
    eyebrow: t("eyebrow"),
    id: null,
    intro: t("intro"),
    pendingEffectiveValue: t("pendingEffectiveValue"),
    previewValue: t("previewValue"),
    publishedAt: null,
    reviewNotice: t("reviewNotice"),
    source: "fallback",
    title: t("title"),
    version: null,
    versionLabel: t("versionLabel")
  };

  if (!hasSupabasePublicConfig()) {
    return fallback;
  }

  try {
    const supabase = createSupabaseServerClient();
    const result = await supabase
      .from("legal_documents")
      .select(
        "id, document_key, locale, version, title, summary, body_markdown, publication_status, effective_at, published_at, checksum_sha256"
      )
      .eq("document_key", documentKey)
      .eq("locale", locale)
      .eq("publication_status", "published")
      .eq("is_current", true)
      .order("effective_at", {ascending: false})
      .limit(1)
      .maybeSingle();
    const row = (result.data as LegalDocumentRow | null) ?? null;

    if (!row) {
      return fallback;
    }

    return {
      body: row.body_markdown,
      checksum: row.checksum_sha256,
      documentKey,
      effectiveAt: row.effective_at,
      effectiveLabel: fallback.effectiveLabel,
      eyebrow: t("eyebrow"),
      id: row.id,
      intro: row.summary ?? fallback.intro,
      pendingEffectiveValue: fallback.pendingEffectiveValue,
      previewValue: fallback.previewValue,
      publishedAt: row.published_at,
      reviewNotice: fallback.reviewNotice,
      source: "database",
      title: row.title,
      version: row.version,
      versionLabel: fallback.versionLabel
    };
  } catch {
    return fallback;
  }
}

export async function listPublishedLegalDocumentSummaries(
  locale: Locale
): Promise<LegalDocumentSummaryRecord[]> {
  if (!hasSupabasePublicConfig()) {
    return [];
  }

  try {
    const supabase = createSupabaseServerClient();
    const result = await supabase
      .from("legal_documents")
      .select("document_key, title, version, effective_at")
      .eq("locale", locale)
      .eq("publication_status", "published")
      .eq("is_current", true)
      .in("document_key", [...LEGAL_DOCUMENT_KEYS])
      .order("effective_at", {ascending: false});
    const rows =
      ((result.data as Array<{
        document_key: LegalDocumentKey;
        effective_at: string;
        title: string;
        version: string;
      }> | null) ?? []);

    return rows.map((row) => ({
      documentKey: row.document_key,
      effectiveAt: row.effective_at,
      title: row.title,
      version: row.version
    }));
  } catch {
    return [];
  }
}
