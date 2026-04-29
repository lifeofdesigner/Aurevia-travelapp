"use client";

import Link from "next/link";
import {useState} from "react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {type AdminVisaQueueItem} from "@/features/admin/types";

import {AdminVisaBulkReviewForm} from "./admin-visa-bulk-review-form";
import {AdminVisaReviewForm} from "./admin-visa-review-form";

type AdminVisaReviewQueueProps = {
  items: AdminVisaQueueItem[];
  locale: Locale;
};

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function AdminVisaReviewQueue({
  items,
  locale
}: AdminVisaReviewQueueProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.applicationId));

  function toggleApplication(applicationId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(applicationId) ? current : [...current, applicationId];
      }

      return current.filter((value) => value !== applicationId);
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds(checked ? items.map((item) => item.applicationId) : []);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-card shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="font-display text-2xl italic text-foreground">
                Bulk actions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select multiple applications to apply a shared status update across the review queue.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              {selectedIds.length} selected
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input
                checked={allVisibleSelected}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                onChange={(event) => toggleAllVisible(event.target.checked)}
                type="checkbox"
              />
              <span>Select all on this page</span>
            </label>
            <Button onClick={() => setSelectedIds([])} type="button" variant="ghost">
              Clear selection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AdminVisaBulkReviewForm applicationIds={selectedIds} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.applicationId);

          return (
            <Card key={item.applicationId} className="border-border/80 bg-card shadow-soft">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <label className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <input
                        checked={isSelected}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        onChange={(event) =>
                          toggleApplication(item.applicationId, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span className="sr-only">Select application</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-display text-2xl italic text-foreground">
                          {item.applicationReference ?? item.applicationId}
                        </h2>
                        <StatusBadge
                          label={formatStatusLabel(item.status)}
                          status={item.status}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.customerName} | {item.customerEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Destination: {item.countryCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${locale}/admin/visa-review/${item.applicationId}`}>
                        Review application
                      </Link>
                    </Button>
                    {item.uploadCount > 0 ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/admin/visa-applications/${item.applicationId}/documents`}>
                          Download documents
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Created
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatDateTime(item.createdAt, locale)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Submitted
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {item.submittedAt ? formatDateTime(item.submittedAt, locale) : "Not submitted"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Reviewed
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {item.reviewedAt ? formatDateTime(item.reviewedAt, locale) : "Awaiting review"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Documents
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {item.uploadCount} uploaded
                    </p>
                  </div>
                </div>

                <AdminVisaReviewForm
                  applicationId={item.applicationId}
                  currentStatus={item.status}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
