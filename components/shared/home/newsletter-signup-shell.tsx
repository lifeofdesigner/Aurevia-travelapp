"use client";

import dynamic from "next/dynamic";

function NewsletterLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid gap-4 md:grid-cols-[1fr_auto]"
    >
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-full bg-muted/60" />
        <div className="h-11 rounded-lg bg-muted/70" />
      </div>
      <div className="flex items-end">
        <div className="h-11 w-full rounded-lg bg-primary/20 md:w-40" />
      </div>
      <div className="h-4 w-full rounded-lg bg-muted/50 md:col-span-2" />
    </div>
  );
}

export const NewsletterSignupShell = dynamic(
  () =>
    import("@/components/shared/home/newsletter-signup").then(
      (module) => module.NewsletterSignup
    ),
  {loading: NewsletterLoading, ssr: false}
);
