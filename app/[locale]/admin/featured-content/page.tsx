import {type Locale} from "@/lib/i18n/routing";
import {AdminResourceScreen} from "@/features/admin/components/admin-resource-screen";

export default function AdminFeaturedContentPage({params}: {params: {locale: Locale}}) {
  return (
    <AdminResourceScreen
      locale={params.locale}
      path={`/${params.locale}/admin/featured-content`}
      resource="featured-content"
      translationKey="featuredContent"
    />
  );
}
