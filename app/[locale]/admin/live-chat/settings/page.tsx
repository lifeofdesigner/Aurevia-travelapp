import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatSettingsManager} from "@/features/live-chat/components/admin-live-chat-management";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getLiveChatAdminBootstrap} from "@/server/live-chat/service";

export default async function AdminLiveChatSettingsPage({
  params
}: {
  params: {locale: Locale};
}) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const data = await getLiveChatAdminBootstrap(access.identity);

  return (
    <main className="space-y-6">
      <AdminPageHeader
        actions={<AdminLiveChatNav locale={params.locale} />}
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Admin"},
          {href: `/${params.locale}/admin/live-chat/inbox`, label: "Live Chat"},
          {label: "Settings"}
        ]}
        description="Configure widget behavior, routing, offline messaging, notifications, retention, and AI-ready toggles."
        eyebrow="Customer care"
        title="Live chat settings"
      />
      <AdminLiveChatSettingsManager departments={data.departments} settings={data.settings} />
    </main>
  );
}
