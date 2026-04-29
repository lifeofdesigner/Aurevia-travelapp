import {ArrowRight, LockKeyhole} from "lucide-react";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

type VisaAuthGateCardProps = {
  actionLabel: string;
  body: string;
  locale: Locale;
  nextPath: string;
  title: string;
};

export function VisaAuthGateCard({
  actionLabel,
  body,
  locale,
  nextPath,
  title
}: VisaAuthGateCardProps) {
  return (
    <Card className="mx-auto max-w-2xl border-border/80 bg-card/92 shadow-soft">
      <CardHeader className="space-y-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LockKeyhole aria-hidden="true" className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-3xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-7 text-muted-foreground">{body}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="rounded-lg px-6">
            <Link
              href={`${getLocalizedPath(ROUTES.auth, locale)}?next=${encodeURIComponent(nextPath)}`}
            >
              {actionLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
