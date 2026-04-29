import "server-only";

import {redirect} from "next/navigation";

import {
  canAccess as canAccessAdminPermissions,
  hasPermission as hasAdminPermission,
  type AdminPermission
} from "@/lib/auth/admin-permissions";
import {
  mapAdminRoleToLegacyRole,
  type LegacyAdminUserRole
} from "@/lib/auth/admin-auth-config";
import {getAdminSession, requireAdminSession} from "@/lib/auth/admin-auth";
import {type Locale} from "@/lib/i18n/routing";
import {
  hasPermission,
  PERMISSIONS,
  type Permission
} from "@/lib/permissions";
import {type AdminStaffIdentity} from "@/features/admin/types";

function getFallbackRedirect(locale: Locale) {
  return `/${locale}/dashboard`;
}

function splitFullName(fullName: string | null) {
  const normalized = fullName?.trim();

  if (!normalized) {
    return {
      firstName: null,
      lastName: null
    };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);

  return {
    firstName: firstName ?? null,
    lastName: rest.join(" ") || null
  };
}

function buildStaffIdentity(session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>) {
  const {firstName, lastName} = splitFullName(session.fullName);
  const email = typeof session.user.email === "string" ? session.user.email : "";

  return {
    email,
    firstName,
    lastName,
    role: mapAdminRoleToLegacyRole(session.role),
    userId: session.user.id
  } satisfies AdminStaffIdentity;
}

function buildDisplayName(identity: AdminStaffIdentity | null, fallback: string) {
  if (!identity) {
    return fallback;
  }

  const parts = [identity.firstName, identity.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : identity.email;
}

function hasLegacyPermission(role: LegacyAdminUserRole, permission?: Permission) {
  if (!permission) {
    return true;
  }

  return hasPermission(role, permission);
}

function resolveLegacyPermission(permission: Permission): AdminPermission[] | null {
  switch (permission) {
    case PERMISSIONS.bookingReadAll:
      return ["bookings.view"];
    case PERMISSIONS.bookingManageAll:
      return ["bookings.edit"];
    case PERMISSIONS.visaReview:
      return ["visa.review"];
    case PERMISSIONS.privacyManage:
      return ["settings.manage"];
    case PERMISSIONS.settingsManage:
      return ["settings.manage"];
    case PERMISSIONS.adminAccess:
      return null;
    default:
      return [];
  }
}

function hasResolvedPermission(
  role: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>["role"],
  permission?: Permission | AdminPermission | Array<Permission | AdminPermission>
) {
  if (!permission) {
    return true;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  return permissions.some((entry) => {
    if (entry.includes(".")) {
      return hasAdminPermission(role, entry as AdminPermission);
    }

    const mappedPermissions = resolveLegacyPermission(entry as Permission);

    if (mappedPermissions === null) {
      return true;
    }

    return canAccessAdminPermissions(role, mappedPermissions);
  });
}

export async function getCurrentStaffIdentity(): Promise<AdminStaffIdentity | null> {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  return buildStaffIdentity(session);
}

export async function getAdminPageAccess(requiredPermission?: AdminPermission | AdminPermission[]) {
  const session = await requireAdminSession();

  return {
    allowed: Array.isArray(requiredPermission)
      ? canAccessAdminPermissions(session.role, requiredPermission)
      : requiredPermission
        ? hasAdminPermission(session.role, requiredPermission)
        : true,
    identity: buildStaffIdentity(session),
    session
  };
}

export async function requireStaffUser(
  locale: Locale,
  nextPath: string,
  permission?: Permission
): Promise<AdminStaffIdentity> {
  const session = await requireAdminSession();
  const identity = buildStaffIdentity(session);

  if (!hasResolvedPermission(session.role, permission) || !hasLegacyPermission(identity.role, permission)) {
    const fallback = nextPath === `/${locale}/admin` ? getFallbackRedirect(locale) : `/${locale}/admin`;
    redirect(fallback);
  }

  return identity;
}

export async function requireAdminApiUser(
  permission: Permission | AdminPermission | Array<Permission | AdminPermission> = PERMISSIONS.adminAccess
): Promise<AdminStaffIdentity> {
  const session = await requireAdminSession();
  const identity = buildStaffIdentity(session);

  if (!hasResolvedPermission(session.role, permission)) {
    throw new Error("Forbidden.");
  }

  return identity;
}

export function getStaffDisplayName(identity: AdminStaffIdentity) {
  return buildDisplayName(identity, identity.email);
}
