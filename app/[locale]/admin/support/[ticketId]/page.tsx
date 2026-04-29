import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminNoteComposer} from "@/features/admin/components/admin-note-composer";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminSupportReplyComposer} from "@/features/admin/components/admin-support-reply-composer";
import {AdminSupportTicketForm} from "@/features/admin/components/admin-support-ticket-form";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminReferenceData, getAdminSupportTicketDetail} from "@/server/admin/query-service";

type SupportTicketDetailPageProps = {
  params: {
    locale: Locale;
    ticketId: string;
  };
};

export default async function AdminSupportTicketDetailPage({
  params
}: SupportTicketDetailPageProps) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, ticket, references] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Admin"}),
    getAdminSupportTicketDetail(params.ticketId),
    getAdminReferenceData()
  ]);

  if (!ticket) {
    notFound();
  }

  const canReplyToSupport = hasPermission(access.session.role, "support.reply");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {href: `/${params.locale}/admin/support`, label: t("pages.support.title")},
          {label: ticket.ticketNumber}
        ]}
        description={t("pages.support.description")}
        eyebrow={t("shell.eyebrow")}
        title={ticket.ticketNumber}
      />

      <div className="flex flex-wrap gap-3">
        {ticket.bookingId ? (
          <Button asChild variant="outline">
            <Link href={`/${params.locale}/admin/bookings/${ticket.bookingId}`}>
              Open related booking
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.messages.map((message) => (
              <div key={message.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{message.authorLabel}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {message.visibility} | {message.deliveryChannel}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDateTime(message.createdAt, params.locale)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {message.messageBody}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>Ticket controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={ticket.priority} status={ticket.priority} />
                <StatusBadge label={ticket.status} status={ticket.status} />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Subject: {ticket.subject}</p>
                <p>Customer: {ticket.customerName}</p>
                <p>Email: {ticket.customerEmail}</p>
                <p>Created: {formatDateTime(ticket.createdAt, params.locale)}</p>
                <p>Booking: {ticket.bookingReference ?? "Not linked"}</p>
                <p>Assigned: {ticket.assignedAdminLabel ?? "Unassigned"}</p>
              </div>
              {canReplyToSupport ? (
                <AdminSupportTicketForm
                  adminOptions={references.adminUsers}
                  assignedAdminUserId={ticket.assignedAdminUserId}
                  priority={ticket.priority}
                  status={ticket.status}
                  ticketId={ticket.id}
                />
              ) : null}
            </CardContent>
          </Card>

          {canReplyToSupport ? (
            <Card className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <CardTitle>Reply to customer</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminSupportReplyComposer ticketId={ticket.id} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canReplyToSupport ? (
                <AdminNoteComposer entityId={ticket.id} entityType="support_ticket" />
              ) : null}
              <div className="space-y-3">
                {ticket.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No internal notes have been added for this ticket yet.
                  </p>
                ) : (
                  ticket.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{note.title ?? "Untitled note"}</p>
                        <StatusBadge
                          label={note.isVisibleToCustomer ? "visible" : "internal"}
                          status={note.isVisibleToCustomer ? "published" : "draft"}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {note.noteBody}
                      </p>
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
