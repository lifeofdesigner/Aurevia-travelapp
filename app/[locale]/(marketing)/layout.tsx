import {type Metadata} from "next";
import {type ReactNode} from "react";

import {SiteShell} from "@/components/shared/layout/site-shell";
import {type Locale} from "@/lib/i18n/routing";
import {MARKETING_ROUTE_METADATA} from "@/lib/seo";

type MarketingLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

export const metadata: Metadata = MARKETING_ROUTE_METADATA;

export default function MarketingLayout({children, params}: MarketingLayoutProps) {
  return <SiteShell locale={params.locale}>{children}</SiteShell>;
}
