import {type Metadata} from "next";
import {type ReactNode} from "react";

import {SiteShell} from "@/components/shared/layout/site-shell";
import {type Locale} from "@/lib/i18n/routing";
import {BOOKING_ROUTE_METADATA} from "@/lib/seo";

type BookingLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

export const metadata: Metadata = BOOKING_ROUTE_METADATA;

export default function BookingLayout({children, params}: BookingLayoutProps) {
  return (
    <SiteShell locale={params.locale} contentClassName="bg-background">
      {children}
    </SiteShell>
  );
}
