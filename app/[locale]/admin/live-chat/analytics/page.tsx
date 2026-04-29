import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatAnalytics} from "@/features/live-chat/components/admin-live-chat-analytics";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getLiveChatAnalytics} from "@/server/live-chat/service";

export default async function AdminLiveChatAnalyticsPage({
  params
}: {
  params: {locale: Locale};
}) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const analytics = await getLiveChatAnalytics(access.identity);

  return (
    <main className="space-y-6">
      <AdminPageHeader
        actions={<AdminLiveChatNav locale={params.locale} />}
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Admin"},
          {href: `/${params.locale}/admin/live-chat/inbox`, label: "Live Chat"},
          {label: "Analytics"}
        ]}
        description="Track response speed, resolution, CSAT, team workload, departments, tags, and visitor mix."
        eyebrow="Customer care"
        title="Live chat analytics"
      />
      <AdminLiveChatAnalytics analytics={analytics} />
    </main>
  );
}
