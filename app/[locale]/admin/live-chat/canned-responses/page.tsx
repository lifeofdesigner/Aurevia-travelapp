import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatCannedResponsesManager} from "@/features/live-chat/components/admin-live-chat-management";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getLiveChatAdminBootstrap} from "@/server/live-chat/service";

export default async function AdminLiveChatCannedResponsesPage({
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
          {label: "Canned responses"}
        ]}
        description="Create reusable replies that agents can insert into live conversations."
        eyebrow="Customer care"
        title="Canned responses"
      />
      <AdminLiveChatCannedResponsesManager data={data} />
    </main>
  );
}
