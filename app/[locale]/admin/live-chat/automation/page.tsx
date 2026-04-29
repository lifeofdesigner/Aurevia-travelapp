import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatAutomationManager} from "@/features/live-chat/components/admin-live-chat-management";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";

export default async function AdminLiveChatAutomationPage({
  params
}: {
  params: {locale: Locale};
}) {
  const access = await getAdminPageAccess("support.view");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        actions={<AdminLiveChatNav locale={params.locale} />}
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Admin"},
          {href: `/${params.locale}/admin/live-chat/inbox`, label: "Live Chat"},
          {label: "Automation"}
        ]}
        description="Create basic routing and tagging rules for incoming conversations."
        eyebrow="Customer care"
        title="Live chat automation"
      />
      <AdminLiveChatAutomationManager />
    </main>
  );
}
