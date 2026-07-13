"use client";

import {ChevronDown, LayoutDashboard, LogOut, UserRound} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";

import {CurrencySwitcherShell} from "@/components/shared/layout/currency-switcher-shell";
import {type HeaderAccount} from "@/components/shared/layout/header-account-types";
import {MobileNavigation} from "@/components/shared/layout/mobile-navigation";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";
import {cn} from "@/lib/utils";
import {type SiteBranding} from "@/server/brand/site-branding";

type SiteHeaderProps = {
  account: HeaderAccount | null;
  branding: SiteBranding;
  locale: Locale;
  showSignInLink?: boolean;
};

const navItems = [
  {label: "Flights", route: ROUTES.flights},
  {label: "Hotels", route: ROUTES.hotels},
  {label: "Cars", route: ROUTES.cars},
  {label: "Tours", route: ROUTES.tours},
  {label: "Transfers", route: ROUTES.transfers},
  {label: "Visa", route: ROUTES.visa}
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function splitBrandName(siteName: string) {
  const [first, ...rest] = siteName.trim().split(/\s+/);

  return {
    first: first || "Travel",
    rest: rest.join(" ") || "Desk"
  };
}

function HeaderAccountMenu({
  account,
  dashboardHref,
  locale,
  profileHref
}: {
  account: HeaderAccount;
  dashboardHref: string;
  locale: Locale;
  profileHref: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (result.error) {
      return;
    }

    setIsOpen(false);
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-8 max-w-[13rem] items-center gap-2 rounded-[3px] border border-border px-3 text-[12px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserRound aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
        <span className="truncate">{account.displayName}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 flex-none transition-transform",
            isOpen ? "rotate-180" : null
          )}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.55rem)] z-[70] w-72 rounded-[6px] border border-border bg-card p-2 text-card-foreground shadow-2xl"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold">
              {account.displayName}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {account.email}
            </p>
          </div>

          <Link
            href={dashboardHref}
            role="menuitem"
            className="mt-2 flex min-h-10 items-center gap-2 rounded-[4px] px-3 text-[12px] font-semibold text-card-foreground no-underline transition-colors hover:bg-muted"
            onClick={() => setIsOpen(false)}
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href={profileHref}
            role="menuitem"
            className="flex min-h-10 items-center gap-2 rounded-[4px] px-3 text-[12px] font-semibold text-card-foreground no-underline transition-colors hover:bg-muted"
            onClick={() => setIsOpen(false)}
          >
            <UserRound aria-hidden="true" className="h-4 w-4" />
            Profile and settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-2 rounded-[4px] px-3 text-left text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-wait disabled:opacity-60"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {isSigningOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({
  account,
  branding,
  locale,
  showSignInLink = true
}: SiteHeaderProps) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [hasScrolled, setHasScrolled] = useState(false);
  const homeHref = getLocalizedPath(ROUTES.home, locale);
  const signInHref = getLocalizedPath(ROUTES.auth, locale);
  const dashboardHref = getLocalizedPath(ROUTES.dashboard, locale);
  const profileHref = `${dashboardHref}/profile`;
  const primaryCtaHref = `${homeHref}#search-planner`;
  const links = navItems.map((item) => ({
    href: getLocalizedPath(item.route, locale),
    isActive: isActivePath(pathname, getLocalizedPath(item.route, locale)),
    label: item.label
  }));

  useEffect(() => {
    function handleScroll() {
      setHasScrolled(window.scrollY > 4);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, {passive: true});

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-card text-foreground",
        hasScrolled
          ? "border-b border-border shadow-sm"
          : "border-b border-transparent"
      )}
    >
      <div className="container flex h-[60px] items-center justify-between gap-5">
        <Link
          href={homeHref}
          className="inline-flex min-h-10 items-center gap-2 no-underline"
        >
          {branding.logoUrl ? (
            <Image
              alt={`${branding.siteName} logo`}
              className="max-h-9 w-auto object-contain"
              height={36}
              priority
              src={branding.logoUrl}
              width={156}
            />
          ) : (
            <>
              <span className="font-display text-[20px] leading-none text-foreground">
                {splitBrandName(branding.siteName).first}
              </span>
              <span className="font-display text-[20px] leading-none text-primary">
                {splitBrandName(branding.siteName).rest}
              </span>
            </>
          )}
        </Link>

        <nav
          aria-label={t("primaryLabel")}
          className="hidden items-center gap-6 lg:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.08em] no-underline transition-colors",
                link.isActive
                  ? "text-primary"
                  : "text-foreground/50 hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <CurrencySwitcherShell />
          {account ? (
            <HeaderAccountMenu
              account={account}
              dashboardHref={dashboardHref}
              locale={locale}
              profileHref={profileHref}
            />
          ) : showSignInLink ? (
            <Link
              href={signInHref}
              className="text-[12px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href={primaryCtaHref}
            className="inline-flex h-8 items-center justify-center rounded-[3px] bg-primary px-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground no-underline transition-colors hover:bg-primary-dark"
          >
            Plan Journey
          </Link>
        </div>

        <div className="md:hidden">
          <MobileNavigation
            account={account}
            branding={branding}
            closeLabel={t("closeMenu")}
            dashboardHref={dashboardHref}
            homeHref={homeHref}
            links={links.map(({href, isActive, label}) => ({
              href,
              isActive,
              label
            }))}
            menuLabel={t("menu")}
            planJourneyHref={primaryCtaHref}
            planJourneyLabel="Plan Journey"
            primaryLabel={t("primaryLabel")}
            profileHref={profileHref}
            showSignInLink={showSignInLink}
            signInHref={signInHref}
            signInLabel="Sign in"
          />
        </div>
      </div>
    </header>
  );
}
