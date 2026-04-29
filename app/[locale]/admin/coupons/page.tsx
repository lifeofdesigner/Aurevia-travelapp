import {getTranslations} from "next-intl/server";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AdminAccessDenied} from "@/features/admin/components/admin-access-denied";
import {AdminExpiredCouponsAction} from "@/features/admin/components/admin-expired-coupons-action";
import {AdminPageHeader} from "@/features/admin/components/admin-page-header";
import {AdminResourceManager} from "@/features/admin/components/admin-resource-manager";
import {buildAdminResourcePageData} from "@/features/admin/lib/resource-config";
import {type Locale} from "@/lib/i18n/routing";
import {getAdminReferenceData, listAdminResourceRecords} from "@/server/admin/query-service";
import {getAdminPageAccess} from "@/server/admin/auth";

export default async function AdminCouponsPage({params}: {params: {locale: Locale}}) {
  const access = await getAdminPageAccess("coupons.manage");

  if (!access.allowed) {
    return <AdminAccessDenied />;
  }

  const [t, resourceT, commonT, records, references] = await Promise.all([
    getTranslations({locale: params.locale, namespace: "Admin.pages"}),
    getTranslations({locale: params.locale, namespace: "Admin.resourcesConfig.coupons"}),
    getTranslations({locale: params.locale, namespace: "Admin.resourcesConfigCommon"}),
    listAdminResourceRecords("coupons"),
    getAdminReferenceData()
  ]);

  const pageData = buildAdminResourcePageData({
    commonT,
    records,
    references,
    resource: "coupons"
  });

  return (
    <main className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          {href: `/${params.locale}/admin`, label: t("overview.title")},
          {label: resourceT("title")}
        ]}
        description={resourceT("description")}
        eyebrow={t("shell.eyebrow")}
        title={resourceT("title")}
      />

      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Coupon maintenance</CardTitle>
            <p className="text-sm leading-7 text-muted-foreground">
              Create promo codes with booking thresholds, usage limits, expiry windows, and product targeting.
            </p>
          </div>
          <AdminExpiredCouponsAction />
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">
            Usage counts are pulled from the live coupon ledger. Expired coupons can be soft-deleted in one action while still preserving historical redemption data.
          </p>
        </CardContent>
      </Card>

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
