import {AdminHotelsManager} from "@/features/admin/components/admin-hotels-manager";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminHotelsManagerData} from "@/server/admin/hotels-manager-service";

type AdminHotelsPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminHotelsPage({params}: AdminHotelsPageProps) {
  const access = await getAdminPageAccess("hotels.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const data = await getAdminHotelsManagerData();

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Overview"},
          {label: "Hotels"}
        ]}
        description="Review hotel demand and manage merchandising rules for featured properties, markup strategy, and result visibility."
        eyebrow="CMS"
        title="Hotels Manager"
      />

      <AdminHotelsManager initialData={data} locale={params.locale} />
    </main>
  );
}
