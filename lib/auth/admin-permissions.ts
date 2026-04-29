import {type AdminRole} from "@/lib/auth/admin-auth-config";

export const permissions = {
  super_admin: [
    "homepage.manage",
    "flights.manage",
    "hotels.manage",
    "bookings.view",
    "bookings.edit",
    "bookings.refund",
    "customers.view",
    "customers.edit",
    "customers.delete",
    "coupons.manage",
    "support.view",
    "support.reply",
    "visa.review",
    "integrations.manage",
    "settings.manage",
    "admin_users.manage",
    "analytics.view",
    "export.all"
  ],
  admin: [
    "homepage.manage",
    "flights.manage",
    "hotels.manage",
    "bookings.view",
    "bookings.edit",
    "bookings.refund",
    "customers.view",
    "customers.edit",
    "coupons.manage",
    "support.view",
    "support.reply",
    "visa.review",
    "settings.view",
    "analytics.view",
    "export.all"
  ],
  agent: [
    "bookings.view",
    "bookings.edit",
    "customers.view",
    "support.view",
    "support.reply",
    "visa.review"
  ],
  support: [
    "support.view",
    "support.reply",
    "bookings.view",
    "customers.view"
  ]
} as const;

export type AdminPermission = (typeof permissions)[AdminRole][number];

export function hasPermission(role: AdminRole, permission: AdminPermission) {
  const permissionList = permissions[role] as readonly AdminPermission[];
  return permissionList.includes(permission);
}

export function canAccess(role: AdminRole, permissionList: readonly AdminPermission[]) {
  return permissionList.some((permission) => hasPermission(role, permission));
}
