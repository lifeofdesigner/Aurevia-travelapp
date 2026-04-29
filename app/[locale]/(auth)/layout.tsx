import {type Metadata} from "next";
import {type ReactNode} from "react";

import {SiteFooter} from "@/components/shared/layout/site-footer";
import {type Locale} from "@/lib/i18n/routing";
import {PRIVATE_ROUTE_METADATA} from "@/lib/seo";
import {getSiteBranding} from "@/server/brand/site-branding";

export const metadata: Metadata = PRIVATE_ROUTE_METADATA;

type AuthLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

export default async function AuthLayout({children, params}: AuthLayoutProps) {
  const branding = await getSiteBranding();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-secondary/80 via-secondary/30 to-transparent"
      />
      <div className="relative flex-1">{children}</div>
      <SiteFooter branding={branding} locale={params.locale} />
    </div>
  );
}
