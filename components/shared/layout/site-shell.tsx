import {type ReactNode} from "react";

import {type Locale} from "@/lib/i18n/routing";
import {cn} from "@/lib/utils";
import {getHeaderAccount} from "@/server/account/header-session";
import {getSiteBranding} from "@/server/brand/site-branding";

import {SiteFooter} from "./site-footer";
import {SiteHeader} from "./site-header";

type SiteShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerAuthMode?: "customer" | "none";
  locale: Locale;
};

export async function SiteShell({
  children,
  className,
  contentClassName,
  headerAuthMode = "customer",
  locale
}: SiteShellProps) {
  const [account, branding] = await Promise.all([
    headerAuthMode === "customer" ? getHeaderAccount() : Promise.resolve(null),
    getSiteBranding()
  ]);

  return (
    <div className={cn("relative flex min-h-screen flex-col", className)}>
      <SiteHeader
        account={account}
        branding={branding}
        locale={locale}
        showSignInLink={headerAuthMode === "customer"}
      />
      <div className={cn("flex-1", contentClassName)}>{children}</div>
      <SiteFooter branding={branding} locale={locale} />
    </div>
  );
}
