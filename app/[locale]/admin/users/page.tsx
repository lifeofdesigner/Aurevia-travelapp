import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminUsersManager} from "@/features/admin/components/admin-users-manager";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminUsersManagerData} from "@/server/admin/control-center-service";
import {getAdminPageAccess} from "@/server/admin/auth";

type AdminUsersPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminUsersPage({params}: AdminUsersPageProps) {
  const access = await getAdminPageAccess("admin_users.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const data = await getAdminUsersManagerData();

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Dashboard"},
          {label: "Admin Users"}
        ]}
        description="Create customers and staff, approve access, adjust roles, and deactivate accounts without touching the database manually."
        eyebrow="Admin"
        title="Users & Approvals"
      />

      <AdminUsersManager currentUserId={access.identity.userId} data={data} />
    </main>
  );
}
