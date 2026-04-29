import {LegalPage} from "@/components/shared/layout/legal-page";
import {type Locale} from "@/lib/i18n/routing";

type TermsPageProps = {
  params: {
    locale: Locale;
  };
};

export default function TermsPage({params}: TermsPageProps) {
  return (
    <LegalPage
      documentKey="terms_of_use"
      locale={params.locale}
      namespace="Legal.terms"
    />
  );
}
