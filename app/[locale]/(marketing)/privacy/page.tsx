import {LegalPage} from "@/components/shared/layout/legal-page";
import {type Locale} from "@/lib/i18n/routing";

type PrivacyPageProps = {
  params: {
    locale: Locale;
  };
};

export default function PrivacyPage({params}: PrivacyPageProps) {
  return (
    <LegalPage
      documentKey="privacy_policy"
      locale={params.locale}
      namespace="Legal.privacy"
    />
  );
}
