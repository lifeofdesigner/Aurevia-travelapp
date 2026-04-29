"use client";

import {
  BadgeCheck,
  CreditCard,
  LayoutDashboard,
  Luggage,
  PlaneTakeoff,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Link from "next/link";
import {useSelectedLayoutSegment} from "next/navigation";
import {useTranslations} from "next-intl";

import {cn} from "@/lib/utils";
import {type Locale} from "@/lib/i18n/routing";

const navigationItems = [
  {
    href: "",
    icon: LayoutDashboard,
    key: "overview",
    segments: [null]
  },
  {
    href: "/bookings",
    icon: PlaneTakeoff,
    key: "bookings",
    segments: ["bookings"]
  },
  {
    href: "/profile",
    icon: UserRound,
    key: "profile",
    segments: ["profile", "settings"]
  },
  {
    href: "/travelers",
    icon: Luggage,
    key: "travelers",
    segments: ["travelers"]
  },
  {
    href: "/payments",
    icon: CreditCard,
    key: "payments",
    segments: ["payments"]
  },
  {
    href: "/privacy",
    icon: ShieldCheck,
    key: "privacy",
    segments: ["privacy"]
  },
  {
    href: "/visa",
    icon: BadgeCheck,
    key: "visa",
    segments: ["visa"]
  }
] as const;

type DashboardNavProps = {
  locale: Locale;
};

export function DashboardNav({locale}: DashboardNavProps) {
  const t = useTranslations("Dashboard.nav");
  const segment = useSelectedLayoutSegment();

  return (
    <nav aria-label={t("ariaLabel")} className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.segments.some((value) => value === segment);

        return (
          <Link
            key={item.key}
            href={`/${locale}/dashboard${item.href}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/20 hover:text-foreground"
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
