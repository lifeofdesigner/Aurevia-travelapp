import {getTranslations} from "next-intl/server";

type LegalPageProps = {
  namespace: "Legal.privacy" | "Legal.terms" | "Legal.cookies" | "Legal.refunds";
};

export async function LegalPage({namespace}: LegalPageProps) {
  const t = await getTranslations(namespace);

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {t("intro")}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 text-sm leading-7 text-muted-foreground">
          <p>{t("body")}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("reviewNotice")}</p>
      </div>
    </main>
  );
}
