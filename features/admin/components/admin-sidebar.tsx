"use client";

import Link from "next/link";
import {
  Building2,
  Cable,
  House,
  LayoutGrid,
  LifeBuoy,
  MessagesSquare,
  type LucideIcon,
  Percent,
  Plane,
  Settings2,
  ShieldCheck,
  UserCog,
  Users,
  Wallet
} from "lucide-react";
import {usePathname} from "next/navigation";
import {useLocale} from "next-intl";

import {
  type AdminRole
} from "@/lib/auth/admin-auth-config";
import {
  hasPermission,
  type AdminPermission
} from "@/lib/auth/admin-permissions";
import {cn} from "@/lib/utils";

type AdminSidebarProps = {
  role: AdminRole;
};

type SidebarItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission?: AdminPermission;
};

type SidebarGroup = {
  items: SidebarItem[];
  title: string;
};

const sidebarGroups: SidebarGroup[] = [
  {
    items: [
      {
        href: "/admin",
        icon: LayoutGrid,
        label: "Dashboard",
        permission: "analytics.view"
      },
      {
        href: "/admin/homepage",
        icon: House,
        label: "Homepage",
        permission: "homepage.manage"
      }
    ],
    title: "Core"
  },
  {
    items: [
      {
        href: "/admin/flights",
        icon: Plane,
        label: "Flights",
        permission: "flights.manage"
      },
      {
        href: "/admin/hotels",
        icon: Building2,
        label: "Hotels",
        permission: "hotels.manage"
      },
      {
        href: "/admin/bookings",
        icon: Wallet,
        label: "Bookings",
        permission: "bookings.view"
      },
      {
        href: "/admin/customers",
        icon: Users,
        label: "Customers",
        permission: "customers.view"
      },
      {
        href: "/admin/coupons",
        icon: Percent,
        label: "Coupons",
        permission: "coupons.manage"
      }
    ],
    title: "Commerce"
  },
  {
    items: [
      {
        href: "/admin/support",
        icon: LifeBuoy,
        label: "Support",
        permission: "support.view"
      },
      {
        href: "/admin/live-chat",
        icon: MessagesSquare,
        label: "Live Chat",
        permission: "support.view"
      },
      {
        href: "/admin/visa-review",
        icon: ShieldCheck,
        label: "Visa Review",
        permission: "visa.review"
      }
    ],
    title: "Operations"
  },
  {
    items: [
      {
        href: "/admin/integrations",
        icon: Cable,
        label: "Integrations",
        permission: "integrations.manage"
      },
      {
        href: "/admin/settings",
        icon: Settings2,
        label: "Site Settings",
        permission: "settings.manage"
      },
      {
        href: "/admin/users",
        icon: UserCog,
        label: "Admin Users",
        permission: "admin_users.manage"
      }
    ],
    title: "Control Center"
  }
];

function normalizePath(path: string) {
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function isItemVisible(item: SidebarItem, role: AdminRole) {
  if (item.permission && !hasPermission(role, item.permission)) {
    return false;
  }

  return true;
}

export function AdminSidebar({role}: AdminSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const normalizedPath = normalizePath(pathname);

  return (
    <nav
      aria-label="Admin navigation"
      className="rounded-lg border border-[#1b2a20] bg-[#111d15] p-3 text-[#e8dfc8] shadow-[0_18px_40px_rgba(17,29,21,0.22)]"
    >
      <div className="space-y-5">
        {sidebarGroups.map((group) => {
          const visibleItems = group.items.filter((item) => isItemVisible(item, role));

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={group.title} className="space-y-2">
              <p className="hidden px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#555] xl:block">
                {group.title}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const href = `/${locale}${item.href}`;
                  const isActive =
                    normalizedPath === href ||
                    (item.href !== "/admin" && normalizedPath.startsWith(href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-[48px] items-center rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111d15] xl:gap-3",
                        isActive
                          ? "border-l-[#c9a84c] bg-[rgba(201,168,76,0.08)] text-[#e8dfc8]"
                          : "border-l-transparent text-[rgba(232,223,200,0.62)] hover:bg-white/5 hover:text-[#e8dfc8]"
                      )}
                      href={href}
                      title={item.label}
                    >
                      <span className="flex w-full items-center justify-center xl:w-auto xl:justify-start">
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#c9a84c]" />
                      </span>
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
