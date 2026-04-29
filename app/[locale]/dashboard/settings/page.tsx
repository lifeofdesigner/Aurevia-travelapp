import {redirect} from "next/navigation";

import {type Locale} from "@/lib/i18n/routing";

type SettingsRedirectPageProps = {
  params: {
    locale: Locale;
  };
};

export default function SettingsRedirectPage({params}: SettingsRedirectPageProps) {
  redirect(`/${params.locale}/dashboard/profile`);
}
