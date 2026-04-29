import {formatDate} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {
  getLegalDocumentContent,
  type LegalDocumentKey
} from "@/server/privacy/legal-service";

type LegalPageProps = {
  documentKey: LegalDocumentKey;
  locale: Locale;
  namespace: "Legal.privacy" | "Legal.terms" | "Legal.cookies" | "Legal.refunds";
};

export async function LegalPage({
  documentKey,
  locale,
  namespace
}: LegalPageProps) {
  const document = await getLegalDocumentContent({documentKey, locale, namespace});

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase text-primary">
            {document.eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {document.title}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {document.intro}
          </p>
        </div>

        {document.version || document.effectiveAt ? (
          <div className="grid gap-4 rounded-lg border border-border/80 bg-background/70 p-5 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {document.versionLabel}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {document.version ?? document.previewValue}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {document.effectiveLabel}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {document.effectiveAt
                  ? formatDate(document.effectiveAt, locale)
                  : document.pendingEffectiveValue}
              </p>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border bg-card p-6 text-sm leading-7 text-muted-foreground">
          <div className="space-y-4 whitespace-pre-wrap">
            {document.body.split(/\n{2,}/u).map((paragraph, index) => (
              <p key={`${document.documentKey}-${index}`}>{paragraph.trim()}</p>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{document.reviewNotice}</p>
      </div>
    </main>
  );
}
