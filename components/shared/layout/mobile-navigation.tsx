"use client";

import {LayoutDashboard, LogOut, Menu, UserRound, X} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";

import {CurrencySwitcherShell} from "@/components/shared/layout/currency-switcher-shell";
import {type HeaderAccount} from "@/components/shared/layout/header-account-types";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";
import {cn} from "@/lib/utils";
import {type SiteBranding} from "@/server/brand/site-branding";

type MobileNavigationLink = {
  href: string;
  isActive: boolean;
  label: string;
};

type MobileNavigationProps = {
  account: HeaderAccount | null;
  branding: SiteBranding;
  closeLabel: string;
  dashboardHref: string;
  homeHref: string;
  links: MobileNavigationLink[];
  menuLabel: string;
  planJourneyHref: string;
  planJourneyLabel: string;
  primaryLabel: string;
  profileHref: string;
  showSignInLink?: boolean;
  signInHref: string;
  signInLabel: string;
};

function splitBrandName(siteName: string) {
  const [first, ...rest] = siteName.trim().split(/\s+/);

  return {
    first: first || "Travel",
    rest: rest.join(" ") || "Desk"
  };
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [] as HTMLElement[];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function MobileNavigation({
  account,
  branding,
  closeLabel,
  dashboardHref,
  homeHref,
  links,
  menuLabel,
  planJourneyHref,
  planJourneyLabel,
  primaryLabel,
  profileHref,
  showSignInLink = true,
  signInHref,
  signInLabel
}: MobileNavigationProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function closeMenu() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";

    const focusFirstElement = window.setTimeout(() => {
      const focusable = getFocusableElements(panelRef.current);
      (focusable[0] ?? panelRef.current)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(panelRef.current);

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstElement);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
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

    closeMenu();
    router.push(homeHref);
    router.refresh();
  }

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-controls="site-mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? closeLabel : menuLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] border border-[rgba(201,168,76,0.28)] text-[#c9a84c] transition-colors hover:border-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)]"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Menu aria-hidden="true" className="h-5 w-5" />
        )}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(17,29,21,0.45)] backdrop-blur-[1px]"
            onMouseDown={closeMenu}
          />

          <div
            id="site-mobile-navigation"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={primaryLabel}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-[min(24rem,100vw)] flex-col bg-[#1c3d2e] px-5 pb-6 pt-5 text-[#e8dfc8] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(232,223,200,0.1)] pb-4">
              <div className="inline-flex min-h-10 items-center gap-2">
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
                    <span className="font-display text-[20px] leading-none text-[#e8dfc8]">
                      {splitBrandName(branding.siteName).first}
                    </span>
                    <span className="font-display text-[20px] leading-none text-[#c9a84c]">
                      {splitBrandName(branding.siteName).rest}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] border border-[rgba(201,168,76,0.28)] text-[#c9a84c] transition-colors hover:border-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)]"
                onClick={closeMenu}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label={primaryLabel} className="mt-5 flex-1 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-[48px] items-center border-b border-[rgba(232,223,200,0.08)] py-3 text-[12px] font-semibold uppercase tracking-[0.08em] no-underline transition-colors",
                    link.isActive
                      ? "text-[#c9a84c]"
                      : "text-[rgba(232,223,200,0.72)] hover:text-[#e8dfc8]"
                  )}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-3 border-t border-[rgba(232,223,200,0.1)] pt-5">
              <CurrencySwitcherShell label="Currency" variant="panel" />
              {account ? (
                <div className="space-y-2">
                  <div className="rounded-[5px] border border-[rgba(232,223,200,0.12)] bg-[rgba(232,223,200,0.05)] p-3">
                    <p className="truncate text-[13px] font-semibold text-[#e8dfc8]">
                      {account.displayName}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[rgba(232,223,200,0.62)]">
                      {account.email}
                    </p>
                  </div>
                  <Link
                    href={dashboardHref}
                    className="flex min-h-[44px] items-center gap-2 text-[12px] font-medium text-[#e8dfc8] no-underline transition-colors hover:text-[#c9a84c]"
                    onClick={closeMenu}
                  >
                    <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href={profileHref}
                    className="flex min-h-[44px] items-center gap-2 text-[12px] font-medium text-[#e8dfc8] no-underline transition-colors hover:text-[#c9a84c]"
                    onClick={closeMenu}
                  >
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    Profile and settings
                  </Link>
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center gap-2 text-left text-[12px] font-medium text-[#f2c5b8] transition-colors hover:text-[#ffd6c9] disabled:cursor-wait disabled:opacity-60"
                    disabled={isSigningOut}
                    onClick={handleSignOut}
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    {isSigningOut ? "Signing out..." : "Logout"}
                  </button>
                </div>
              ) : showSignInLink ? (
                <Link
                  href={signInHref}
                  className="flex min-h-[48px] items-center text-[12px] font-medium text-[#e8dfc8] no-underline transition-colors hover:text-[#c9a84c]"
                  onClick={closeMenu}
                >
                  {signInLabel}
                </Link>
              ) : null}
              <Link
                href={planJourneyHref}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[3px] bg-[#c9a84c] px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1c3d2e] no-underline transition-colors hover:bg-[#d6b864]"
                onClick={closeMenu}
              >
                {planJourneyLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
