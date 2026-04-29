import {type UserRole} from "@/types/database-enums";

export const ADMIN_AUTH_COOKIE_NAME = "aurevia-admin-auth";
export const ADMIN_SESSION_COOKIE_NAME = "admin_session";

export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "agent",
  "support"
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type LegacyAdminUserRole = Extract<UserRole, "support" | "admin" | "owner">;

const ADMIN_ROLE_TO_LEGACY_ROLE: Record<AdminRole, LegacyAdminUserRole> = {
  super_admin: "owner",
  admin: "admin",
  agent: "support",
  support: "support"
};

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export function mapAdminRoleToLegacyRole(role: AdminRole): LegacyAdminUserRole {
  return ADMIN_ROLE_TO_LEGACY_ROLE[role];
}
