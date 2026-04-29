import {LegalPage} from "@/components/shared/layout/legal-page";
import {type Locale} from "@/lib/i18n/routing";

type RefundsPageProps = {
  params: {
    locale: Locale;
  };
};

export default function RefundsPage({params}: RefundsPageProps) {
  return (
    <LegalPage
      documentKey="refund_policy"
      locale={params.locale}
      namespace="Legal.refunds"
    />
  );
}
