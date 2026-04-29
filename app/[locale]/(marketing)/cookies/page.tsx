import {LegalPage} from "@/components/shared/layout/legal-page";
import {type Locale} from "@/lib/i18n/routing";

type CookiesPageProps = {
  params: {
    locale: Locale;
  };
};

export default function CookiesPage({params}: CookiesPageProps) {
  return (
    <LegalPage
      documentKey="cookie_policy"
      locale={params.locale}
      namespace="Legal.cookies"
    />
  );
}
