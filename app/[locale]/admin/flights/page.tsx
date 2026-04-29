import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminFlightsManager} from "@/features/admin/components/admin-flights-manager";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminPageAccess} from "@/server/admin/auth";
import {getAdminFlightsManagerData} from "@/server/admin/flights-manager-service";

type AdminFlightsPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function AdminFlightsPage({params}: AdminFlightsPageProps) {
  const access = await getAdminPageAccess("flights.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const data = await getAdminFlightsManagerData();

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: "Overview"},
          {label: "Flights"}
        ]}
        description="Monitor flight demand and manage the operational rules that shape route merchandising, airline visibility, and baggage messaging."
        eyebrow="CMS"
        title="Flights Manager"
      />

      <AdminFlightsManager initialData={data} locale={params.locale} />
    </main>
  );
}
