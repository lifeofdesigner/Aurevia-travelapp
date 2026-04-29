import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatAgentsManager} from "@/features/live-chat/components/admin-live-chat-management";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminReferenceData} from "@/server/admin/query-service";
import {getLiveChatAdminBootstrap} from "@/server/live-chat/service";

export default async function AdminLiveChatAgentsPage({
  params
}: {
  params: {locale: Locale};
}) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [data, references] = await Promise.all([
    getLiveChatAdminBootstrap(access.identity),
    getAdminReferenceData()
  ]);

  return (
    <main className="space-y-6">
      <AdminPageHeader
        actions={<AdminLiveChatNav locale={params.locale} />}
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Admin"},
          {href: `/${params.locale}/admin/live-chat/inbox`, label: "Live Chat"},
          {label: "Agents"}
        ]}
        description="Create and manage customer service team members, departments, capacity, and permissions."
        eyebrow="Customer care"
        title="Live chat agents"
      />
      <AdminLiveChatAgentsManager adminUsers={references.adminUsers} data={data} />
    </main>
  );
}
