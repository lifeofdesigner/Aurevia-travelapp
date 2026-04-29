import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type BookingFlowPlaceholderProps = {
  criteria: Array<{
    label: string;
    value: string;
  }>;
  description: string;
  detailBody: string;
  eyebrow: string;
  locale: Locale;
  searchCtaLabel: string;
  searchSummaryTitle: string;
  secureAreaLabel: string;
  subtitle: string;
  title: string;
};

export function BookingFlowPlaceholder({
  criteria,
  description,
  detailBody,
  eyebrow,
  locale,
  searchCtaLabel,
  searchSummaryTitle,
  secureAreaLabel,
  subtitle,
  title
}: BookingFlowPlaceholderProps) {
  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <div className="space-y-4">
            <h1 className="font-display text-4xl tracking-[0.01em] sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>{subtitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-7 text-muted-foreground">{searchSummaryTitle}</p>
              {criteria.length > 0 ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {criteria.map((criterion) => (
                    <div
                      key={criterion.label}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {criterion.label}
                      </dt>
                      <dd className="mt-2 text-sm font-medium text-foreground">
                        {criterion.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="rounded-lg border border-dashed border-border/80 bg-background/60 p-4 text-sm text-muted-foreground">
                  {searchSummaryTitle}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-lg px-6">
                  <Link href={getLocalizedPath(ROUTES.home, locale) + "#search-planner"}>
                    {searchCtaLabel}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-lg px-6">
                  <Link href={getLocalizedPath(ROUTES.auth, locale)}>
                    {secureAreaLabel}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>{description}</p>
              <p>{detailBody}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
