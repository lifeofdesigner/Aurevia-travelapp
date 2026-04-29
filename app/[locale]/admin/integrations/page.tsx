import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminIntegrationsManager} from "@/features/admin/components/admin-integrations-manager";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminIntegrationsManagerData} from "@/server/admin/control-center-service";
import {getAdminPageAccess} from "@/server/admin/auth";

type AdminIntegrationsPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminIntegrationsPage({
  params
}: AdminIntegrationsPageProps) {
  const access = await getAdminPageAccess("integrations.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const data = await getAdminIntegrationsManagerData();

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Dashboard"},
          {label: "Integrations"}
        ]}
        description="Store encrypted provider credentials, switch test and live environments, and verify connectivity from one place."
        eyebrow="Admin"
        title="Integrations"
      />

      <AdminIntegrationsManager data={data} />
    </main>
  );
}
