import {type AdminPermission} from "@/lib/auth/admin-permissions";
import {type AdminResourceKey} from "@/features/admin/types";

const ADMIN_RESOURCE_PERMISSIONS: Record<
  Exclude<AdminResourceKey, "customers">,
  AdminPermission
> = {
  airlines: "flights.manage",
  airports: "flights.manage",
  coupons: "coupons.manage",
  destinations: "homepage.manage",
  "featured-content": "homepage.manage",
  legal: "settings.manage",
  settings: "settings.manage",
  suppliers: "settings.manage",
  "visa-products": "settings.manage"
};

export function getAdminResourcePermission(
  resource: Exclude<AdminResourceKey, "customers">
) {
  return ADMIN_RESOURCE_PERMISSIONS[resource];
}

