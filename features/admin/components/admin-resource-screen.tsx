import {getTranslations} from "next-intl/server";

import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminResourceManager} from "@/features/admin/components/admin-resource-manager";
import {getAdminResourcePermission} from "@/features/admin/lib/admin-resource-permissions";
import {buildAdminResourcePageData} from "@/features/admin/lib/resource-config";
import {type AdminResourceKey} from "@/features/admin/types";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminReferenceData, listAdminResourceRecords} from "@/server/admin/query-service";
import {getAdminPageAccess} from "@/server/admin/auth";

type AdminResourceScreenProps = {
  locale: Locale;
  path: string;
  resource: Exclude<AdminResourceKey, "customers">;
  translationKey:
    | "airlines"
    | "airports"
    | "coupons"
    | "destinations"
    | "featuredContent"
    | "legal"
    | "settings"
    | "suppliers"
    | "visaProducts";
};

export async function AdminResourceScreen({
  locale,
  resource,
  translationKey
}: AdminResourceScreenProps) {
  const access = await getAdminPageAccess(getAdminResourcePermission(resource));

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, resourceT, commonT, records, references] = await Promise.all([
    getTranslations({locale, namespace: "Admin.pages"}),
    getTranslations({locale, namespace: `Admin.resourcesConfig.${translationKey}`}),
    getTranslations({locale, namespace: "Admin.resourcesConfigCommon"}),
    listAdminResourceRecords(resource),
    getAdminReferenceData()
  ]);

  const pageData = buildAdminResourcePageData({
    commonT,
    records,
    references,
    resource
  });

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${locale}/admin`, label: t("overview.title")},
          {label: resourceT("title")}
        ]}
        description={resourceT("description")}
        eyebrow={t("shell.eyebrow")}
        title={resourceT("title")}
      />
      <AdminResourceManager
        allowCreate={pageData.allowCreate}
        allowDelete={pageData.allowDelete}
        allowEdit={pageData.allowEdit}
        columns={pageData.columns}
        emptyBody={resourceT("emptyBody")}
        emptyTitle={resourceT("emptyTitle")}
        fields={pageData.fields}
        resource={pageData.resource}
        rows={pageData.rows}
      />
    </main>
  );
}
