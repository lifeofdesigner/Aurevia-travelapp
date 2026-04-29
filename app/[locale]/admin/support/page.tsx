import Link from "next/link";
import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminPagination} from "@/features/admin/components/admin-pagination";
import {AdminSupportTicketForm} from "@/features/admin/components/admin-support-ticket-form";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminReferenceData, listAdminSupportTickets} from "@/server/admin/query-service";

type SupportPageProps = {
  params: {locale: Locale};
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminSupportPage({
  params,
  searchParams
}: SupportPageProps) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const t = await getTranslations({locale: params.locale, namespace: "Admin"});
  const page = Number(getStringValue(searchParams.page) || "1");
  const status = getStringValue(searchParams.status);
  const priority = getStringValue(searchParams.priority);
  const assignedAdminUserId = getStringValue(searchParams.assignedAdminUserId);
  const dateFrom = getStringValue(searchParams.dateFrom);
  const dateTo = getStringValue(searchParams.dateTo);
  const query = getStringValue(searchParams.q);

  const [{items, pagination}, references] = await Promise.all([
    listAdminSupportTickets({
      assignedAdminUserId: assignedAdminUserId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      priority: priority || undefined,
      query: query || undefined,
      status: status || undefined
    }),
    getAdminReferenceData()
  ]);
  const canReplyToSupport = hasPermission(access.session.role, "support.reply");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {label: t("pages.support.title")}
        ]}
        description={t("pages.support.description")}
        eyebrow={t("shell.eyebrow")}
        title={t("pages.support.title")}
      />

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>Ticket filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-query">
                {t("pages.support.searchLabel")}
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={query}
                id="support-query"
                name="q"
                placeholder={t("pages.support.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-status">
                {t("pages.support.statusLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={status}
                id="support-status"
                name="status"
              >
                <option value="">{t("pages.support.allStatuses")}</option>
                <option value="open">{t("support.form.statusOptions.open")}</option>
                <option value="in_progress">{t("support.form.statusOptions.in_progress")}</option>
                <option value="waiting_on_customer">{t("support.form.statusOptions.waiting_on_customer")}</option>
                <option value="resolved">{t("support.form.statusOptions.resolved")}</option>
                <option value="closed">{t("support.form.statusOptions.closed")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-priority">
                {t("pages.support.priorityLabel")}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={priority}
                id="support-priority"
                name="priority"
              >
                <option value="">{t("pages.support.allPriorities")}</option>
                <option value="low">{t("support.form.priorityOptions.low")}</option>
                <option value="normal">{t("support.form.priorityOptions.normal")}</option>
                <option value="high">{t("support.form.priorityOptions.high")}</option>
                <option value="urgent">{t("support.form.priorityOptions.urgent")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-assigned-admin">
                Assigned agent
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={assignedAdminUserId}
                id="support-assigned-admin"
                name="assignedAdminUserId"
              >
                <option value="">All agents</option>
                {references.adminUsers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-date-from">
                Date from
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateFrom}
                id="support-date-from"
                name="dateFrom"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="support-date-to">
                Date to
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={dateTo}
                id="support-date-to"
                name="dateTo"
                type="date"
              />
            </div>
            <div className="flex items-end gap-3 lg:col-span-4">
              <Button className="bg-[#1c3d2e] text-white hover:bg-[#111d15]" type="submit">
                {t("pages.support.applyFiltersAction")}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/${params.locale}/admin/support`}>Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.length === 0 ? (
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-foreground">
                {t("pages.support.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("pages.support.emptyBody")}
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((ticket) => (
            <Card key={ticket.id} className="border-border/80 bg-card/92 shadow-soft">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{ticket.ticketNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.customerName} | {ticket.customerEmail}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={t(`support.form.priorityOptions.${ticket.priority}`)}
                      status={ticket.priority}
                    />
                    <StatusBadge
                      label={t(`support.form.statusOptions.${ticket.status}`)}
                      status={ticket.status}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{ticket.description}</p>
                <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
                  <p>Created: {formatDateTime(ticket.createdAt, params.locale)}</p>
                  <p>Booking: {ticket.bookingReference ?? "Not linked"}</p>
                  <p>Assigned: {ticket.assignedAdminLabel ?? t("support.form.unassignedOption")}</p>
                  <p>Status: {t(`support.form.statusOptions.${ticket.status}`)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${params.locale}/admin/support/${ticket.id}`}>
                      View conversation
                    </Link>
                  </Button>
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
          ))
        )}
      </div>

      <AdminPagination
        locale={params.locale}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pathname={`/${params.locale}/admin/support`}
        searchParams={searchParams}
      />
    </main>
  );
}
