import {getTranslations} from "next-intl/server";

import {TravelerProfilesManager} from "@/features/account/components/traveler-profiles-manager";
import {type Locale} from "@/lib/i18n/routing";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {
  listAccountCountries,
  listTravelerProfilesForUser
} from "@/server/account/dashboard-service";

type TravelersPageProps = {
  params: {
    locale: Locale;
  };
};

export default async function TravelersPage({params}: TravelersPageProps) {
  const user = await requireAuthenticatedUser(
    params.locale,
    `/${params.locale}/dashboard/travelers`
  );
  const [travellers, countries] = await Promise.all([
    listTravelerProfilesForUser(user.id),
    listAccountCountries()
  ]);
  await getTranslations({locale: params.locale, namespace: "Dashboard.travelers"});

  return <TravelerProfilesManager countries={countries} travelers={travellers} />;
}
