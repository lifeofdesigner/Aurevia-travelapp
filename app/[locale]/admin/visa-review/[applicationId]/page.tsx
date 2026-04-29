import Link from "next/link";
import {notFound} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminNoteComposer} from "@/features/admin/components/admin-note-composer";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminVisaReviewForm} from "@/features/admin/components/admin-visa-review-form";
import {AdminVisaTemplateResponseForm} from "@/features/admin/components/admin-visa-template-response-form";
import {formatDate, formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminVisaApplicationDetail} from "@/server/admin/query-service";

type AdminVisaApplicationDetailPageProps = {
  params: {
    applicationId: string;
    locale: Locale;
  };
};

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatFieldLabel(key: string) {
  return key
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (value) => value.toUpperCase());
}

function formatFieldValue(value: unknown, locale: Locale) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatDate(value, locale);
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return formatDateTime(value, locale);
    }

    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    return JSON.stringify(value, null, 2);
  }

  return JSON.stringify(value, null, 2);
}

export default async function AdminVisaApplicationDetailPage({
  params
}: AdminVisaApplicationDetailPageProps) {
  const access = await getAdminPageAccess("visa.review");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const application = await getAdminVisaApplicationDetail(params.applicationId);

  if (!application) {
    notFound();
  }

  const detailEntries = Object.entries(application.formData);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/${params.locale}/admin/visa-review`}>
                Back to queue
              </Link>
            </Button>
            {application.uploads.length > 0 ? (
              <Button asChild className="bg-[#1c3d2e] text-white hover:bg-[#111d15]">
                <a href={`/api/admin/visa-applications/${application.applicationId}/documents`}>
                  Download all documents
                </a>
              </Button>
            ) : null}
          </div>
        }
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Dashboard"},
          {href: `/${params.locale}/admin/visa-review`, label: "Visa Review"},
          {label: application.applicationReference ?? application.applicationId}
        ]}
        description="Review application data, documents, notes, and applicant communication from one place."
        eyebrow="Admin"
        title={application.applicationReference ?? application.applicationId}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Application summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Destination
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{application.countryCode}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Created
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDateTime(application.createdAt, params.locale)}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Submitted
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {application.submittedAt
                    ? formatDateTime(application.submittedAt, params.locale)
                    : "Not submitted"}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Documents
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {application.uploads.length} uploaded
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Applicant details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Applicant
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {application.customerName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{application.customerEmail}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Reviewed
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {application.reviewedAt
                      ? formatDateTime(application.reviewedAt, params.locale)
                      : "Awaiting review"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last updated {formatDateTime(application.updatedAt, params.locale)}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {detailEntries.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {formatFieldLabel(key)}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                      {formatFieldValue(value, params.locale)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Uploaded documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.uploads.length === 0 ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  No documents have been uploaded for this application yet.
                </p>
              ) : (
                application.uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/80 bg-background/70 p-4"
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{upload.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {upload.documentType} | {formatDateTime(upload.createdAt, params.locale)}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                        {upload.mimeType} | {upload.byteSize.toLocaleString()} bytes
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={upload.accessPath} target="_blank" rel="noreferrer">
                        Open document
                      </a>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Review controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={formatStatusLabel(application.status)}
                  status={application.status}
                />
              </div>
              <AdminVisaReviewForm
                applicationId={application.applicationId}
                currentStatus={application.status}
                showQuickActions
              />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Template response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminVisaTemplateResponseForm applicationId={application.applicationId} />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-2xl italic text-foreground">
                Internal notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AdminNoteComposer entityId={application.applicationId} entityType="visa_application" />
              <div className="space-y-3">
                {application.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No internal notes have been added for this application yet.
                  </p>
                ) : (
                  application.notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{note.title ?? "Untitled note"}</p>
                        <StatusBadge
                          label={note.isVisibleToCustomer ? "visible" : "internal"}
                          status={note.isVisibleToCustomer ? "published" : "draft"}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{note.noteBody}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {note.authorLabel} | {formatDateTime(note.createdAt, params.locale)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
