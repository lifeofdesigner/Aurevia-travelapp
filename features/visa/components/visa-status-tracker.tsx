"use client";

import {CircleCheckBig, Clock3, FilePenLine, SearchCheck, ShieldCheck} from "lucide-react";
import {useTranslations} from "next-intl";

import {formatDate} from "@/lib/dates";
import {cn} from "@/lib/utils";

import {getVisaDisplayStatus} from "../lib/status";
import {type VisaApplicationStatus} from "@/types/database-enums";

type VisaStatusTrackerProps = {
  locale: string;
  reviewedAt?: string | null;
  status: VisaApplicationStatus;
  submittedAt?: string | null;
  updatedAt: string;
};

const trackerSteps = [
  {icon: FilePenLine, key: "draft"},
  {icon: Clock3, key: "submitted"},
  {icon: SearchCheck, key: "in_review"},
  {icon: ShieldCheck, key: "approved"}
] as const;

export function VisaStatusTracker({
  locale,
  reviewedAt,
  status,
  submittedAt,
  updatedAt
}: VisaStatusTrackerProps) {
  const t = useTranslations("Visa.shared");
  const displayStatus = getVisaDisplayStatus(status);
  const statusIndex = trackerSteps.findIndex((step) => step.key === displayStatus);
  const resolvedIndex = statusIndex >= 0 ? statusIndex : 0;

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-card/92 p-5 shadow-soft">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("statusTrackerTitle")}
        </p>
        <p className="text-sm text-muted-foreground">{t(`statusLabels.${displayStatus}`)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {trackerSteps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = resolvedIndex > index || displayStatus === "approved";
          const isActive = displayStatus === step.key;

          return (
            <div
              key={step.key}
              className={cn(
                "rounded-lg border p-4 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/8 text-foreground"
                  : isComplete
                    ? "border-secondary bg-secondary/10 text-foreground"
                    : "border-border/80 bg-background/70 text-muted-foreground"
              )}
            >
              <div className="inline-flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="h-4 w-4" />
                {t(`statusLabels.${step.key}`)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border/80 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("lastUpdatedLabel")}
          </p>
          <p className="mt-2 font-medium text-foreground">{formatDate(updatedAt, locale)}</p>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("submittedLabel")}
          </p>
          <p className="mt-2 font-medium text-foreground">
            {submittedAt ? formatDate(submittedAt, locale) : t("notSubmitted")}
          </p>
        </div>
      </div>

      {displayStatus === "approved" || displayStatus === "rejected" || displayStatus === "needs_changes" ? (
        <div className="rounded-lg border border-border/80 bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
          <p className="inline-flex items-center gap-2 font-medium text-foreground">
            <CircleCheckBig aria-hidden="true" className="h-4 w-4 text-primary" />
            {t(`statusMessages.${displayStatus}`)}
          </p>
          {reviewedAt ? <p className="mt-2">{formatDate(reviewedAt, locale)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
