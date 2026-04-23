import {type ReactNode} from "react";

import {SiteFooter} from "@/components/shared/layout/site-footer";
import {SiteHeader} from "@/components/shared/layout/site-header";
import {type Locale} from "@/lib/i18n/routing";

type AdminLayoutProps = {
  children: ReactNode;
  params: {
    locale: Locale;
  };
};

export default function AdminLayout({children, params}: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={params.locale} />
      <div className="flex-1">{children}</div>
      <SiteFooter locale={params.locale} />
    </div>
  );
}
