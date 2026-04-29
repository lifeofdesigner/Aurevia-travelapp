import {type ReactNode} from "react";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

type VisaProductCardProps = {
  applyHref?: string;
  applyLabel?: string;
  detailLabel?: string;
  detailHref?: string;
  priceBody: ReactNode;
  priceLabel: string;
  requirements: string[];
  requirementsLabel: string;
  summary: string;
  timelineBody: string;
  timelineLabel: string;
  title: string;
};

export function VisaProductCard({
  applyHref,
  applyLabel,
  detailLabel,
  detailHref,
  priceBody,
  priceLabel,
  requirements,
  requirementsLabel,
  summary,
  timelineBody,
  timelineLabel,
  title
}: VisaProductCardProps) {
  return (
    <Card className="border-border/80 bg-card/92 shadow-soft">
      <CardHeader className="space-y-3">
        <CardTitle className="font-display text-3xl tracking-[0.01em]">{title}</CardTitle>
        <p className="text-sm leading-7 text-muted-foreground">{summary}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {priceLabel}
            </p>
            <p className="mt-2 font-display text-3xl text-foreground">{priceBody}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {timelineLabel}
            </p>
            <p className="mt-2 text-sm font-medium leading-7 text-foreground">{timelineBody}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {requirementsLabel}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {requirements.map((requirement) => (
              <li key={requirement}>- {requirement}</li>
            ))}
          </ul>
        </div>

        {detailHref || applyHref ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            {detailHref && detailLabel ? (
              <Button asChild className="rounded-lg px-6">
                <Link href={detailHref}>{detailLabel}</Link>
              </Button>
            ) : null}
            {applyHref && applyLabel ? (
              <Button asChild variant="outline" className="rounded-lg px-6">
                <Link href={applyHref}>{applyLabel}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
