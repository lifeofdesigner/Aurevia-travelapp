import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminSiteSettingsManager} from "@/features/admin/components/admin-site-settings-manager";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminSiteSettingsData} from "@/server/admin/control-center-service";
import {buildAdminEmailTemplatePreviews} from "@/server/email/send-email";

type AdminSettingsPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminSettingsPage({
  params
}: AdminSettingsPageProps) {
  const access = await getAdminPageAccess("settings.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [data, emailPreviews] = await Promise.all([
    getAdminSiteSettingsData(),
    buildAdminEmailTemplatePreviews()
  ]);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Dashboard"},
          {label: "Site Settings"}
        ]}
        description="Manage operational defaults for contact details, booking policies, payments, email behavior, and maintenance mode."
        eyebrow="Admin"
        title="Site Settings"
      />

      <AdminSiteSettingsManager data={data} emailPreviews={emailPreviews} />
    </main>
  );
}
