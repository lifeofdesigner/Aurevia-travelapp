import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminHomepageManager} from "@/features/admin/components/admin-homepage-manager";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminHomepageData} from "@/server/homepage/admin-service";

type AdminHomepagePageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminHomepagePage({params}: AdminHomepagePageProps) {
  const access = await getAdminPageAccess("homepage.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const homepageData = await getAdminHomepageData(params.locale);

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Overview"},
          {label: "Homepage"}
        ]}
        description="Control every homepage section from one operational workspace, including hero content, banners, destinations, deals, and shared homepage copy."
        eyebrow="CMS"
        title="Homepage Manager"
      />

      <AdminHomepageManager initialData={homepageData} />
    </main>
  );
}
