import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminLiveChatInbox} from "@/features/live-chat/components/admin-live-chat-inbox";
import {AdminLiveChatNav} from "@/features/live-chat/components/admin-live-chat-nav";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getLiveChatAdminBootstrap} from "@/server/live-chat/service";

export default async function AdminLiveChatInboxPage({
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
          {label: "Live Chat"}
        ]}
        description="Handle website chats, assignments, notes, tags, ratings, and live customer context."
        eyebrow="Customer care"
        title="Live chat inbox"
      />
      <AdminLiveChatInbox initialData={data} />
    </main>
  );
}
