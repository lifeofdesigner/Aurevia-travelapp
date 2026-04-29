import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminCustomerOperations} from "@/features/admin/components/admin-customer-operations";
import {AdminNoteComposer} from "@/features/admin/components/admin-note-composer";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {hasPermission} from "@/lib/auth/admin-permissions";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {formatMoney} from "@/lib/money";
import {getSiteBranding} from "@/server/brand/site-branding";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminCustomerDetail} from "@/server/admin/query-service";

type CustomerDetailPageProps = {
  params: {
    locale: Locale;
    userId: string;
  };
};

export default async function AdminCustomerDetailPage({
  params
}: CustomerDetailPageProps) {
  const access = await getAdminPageAccess("customers.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, customer, branding] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Admin"}),
    getAdminCustomerDetail(params.userId),
    getSiteBranding()
  ]);

  if (!customer) {
    notFound();
  }

  const customerName =
    `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || customer.email;
  const canManageCustomer = hasPermission(access.session.role, "customers.edit");
  const canExportCustomers = hasPermission(access.session.role, "export.all");

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("pages.overview.title")},
          {href: `/${params.locale}/admin/customers`, label: t("pages.customers.title")},
          {label: customerName}
        ]}
        description={t("pages.customers.description")}
        eyebrow={t("shell.eyebrow")}
        title={customerName}
      />

      <div className="flex flex-wrap gap-3">
        {canExportCustomers ? (
          <Button asChild className="bg-[#1c3d2e] text-white hover:bg-[#111d15]">
            <Link href={`/api/admin/customers/export?q=${encodeURIComponent(customer.email)}`}>
              Export matching customers CSV
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>Customer profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 font-medium text-foreground">{customer.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Phone
                </p>
                <p className="mt-1 text-foreground">{customer.phone ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Role
                </p>
                <p className="mt-1 text-foreground">{t(`shell.roleOptions.${customer.role}`)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Account status
                </p>
                <div className="mt-2">
                  <StatusBadge
                    label={customer.isSuspended ? "suspended" : "active"}
                    status={customer.isSuspended ? "cancelled" : "confirmed"}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Join date
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {formatDateTime(customer.createdAt, params.locale)}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Last login
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {customer.lastLoginAt
                    ? formatDateTime(customer.lastLoginAt, params.locale)
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Activity
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {customer.bookingCount} bookings | {customer.visaApplicationCount} visa applications
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Spend summary
              </p>
              {customer.spendSummary.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No captured payments recorded yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  {customer.spendSummary.map((entry) => (
                    <div key={entry.currency} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {entry.currency}
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatMoney(
                          {
                            amountMinor: entry.amountMinor,
                            currency: entry.currency
                          },
                          params.locale
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AdminCustomerOperations
            canManageCustomer={canManageCustomer}
            customerEmail={customer.email}
            customerName={customerName}
            isSuspended={customer.isSuspended}
            siteName={branding.siteName}
            userId={customer.userId}
          />

          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageCustomer ? (
                <AdminNoteComposer entityId={customer.userId} entityType="customer" />
              ) : null}
              <div className="space-y-3">
                {customer.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No internal notes have been added for this customer yet.
                  </p>
                ) : (
                  customer.notes.map((note) => (
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

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This customer has not placed any bookings yet.
            </p>
          ) : (
            customer.bookings.map((booking) => (
              <div key={booking.bookingId} className="rounded-lg border border-border/80 bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{booking.bookingReference}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`dashboard.bookingTypeOptions.${booking.primaryBookingType}`)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${params.locale}/admin/bookings/${booking.bookingId}`}>
                      View booking
                    </Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge
                    label={t(`dashboard.bookingStatusOptions.${booking.status}`)}
                    status={booking.status}
                  />
                  <StatusBadge
                    label={t(`dashboard.paymentStatusOptions.${booking.paymentStatus}`)}
                    status={booking.paymentStatus}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{formatDateTime(booking.createdAt, params.locale)}</span>
                  <span>
                    {formatMoney(
                      {
                        amountMinor: booking.totalAmountMinor,
                        currency: booking.currency
                      },
                      params.locale
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
