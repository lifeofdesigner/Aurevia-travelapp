import "server-only";

import {createServerClient} from "@supabase/ssr";
import {type User} from "@supabase/supabase-js";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

import {getSupabasePublicConfig} from "@/lib/env/client";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_ROLES,
  ADMIN_SESSION_COOKIE_NAME,
  isAdminRole,
  type AdminRole
} from "@/lib/auth/admin-auth-config";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Database} from "@/types/supabase";
import {type UserRole} from "@/types/database-enums";

const ADMIN_ROLE_FALLBACK_MAP: Partial<Record<UserRole, AdminRole>> = {
  admin: "admin",
  owner: "super_admin",
  support: "support"
};

type AdminAccessRecord = {
  fullName: string | null;
  role: AdminRole;
};

type AdminSignInResult =
  | {
      role: AdminRole;
      success: true;
    }
  | {
      error: string;
      success: false;
    };

export type AdminSession = {
  fullName: string | null;
  role: AdminRole;
  user: User;
};

export class AdminAuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

function createAdminSupabaseServerClient() {
  const {key, url} = getSupabasePublicConfig();
  const cookieStore = cookies();

  return createServerClient<Database>(url, key, {
    cookieOptions: {
      name: ADMIN_AUTH_COOKIE_NAME
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, options, value}) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

function setAdminSessionCookie(userId: string, role: AdminRole) {
  cookies().set(ADMIN_SESSION_COOKIE_NAME, `${userId}:${role}`, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

function clearAdminSessionCookie() {
  cookies().set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

function getCookieUserId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [userId] = value.split(":");
  return userId || null;
}

function isMissingAdminUsersTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : null;
  const message = "message" in error ? error.message : null;

  return (
    code === "42P01" ||
    (typeof message === "string" && message.includes("admin_users"))
  );
}

async function getFallbackProfileAdminAccess(userId: string) {
  const admin = createSupabaseAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("first_name, last_name, role, is_suspended")
    .eq("user_id", userId)
    .maybeSingle();
  const profile =
    (profileResult.data as
      | {
          first_name: string | null;
          is_suspended: boolean | null;
          last_name: string | null;
          role: UserRole | null;
        }
      | null) ?? null;

  if (profile?.is_suspended) {
    return null;
  }

  const mappedRole = profile?.role ? ADMIN_ROLE_FALLBACK_MAP[profile.role] : null;

  if (!mappedRole) {
    return null;
  }

  return {
    fullName:
      profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null
        : null,
    role: mappedRole
  } satisfies AdminAccessRecord;
}

async function getAdminAccessRecord(userId: string) {
  const admin = createSupabaseAdminClient();
  const adminUserResult = await admin
    .from("admin_users")
    .select("full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (adminUserResult.error && !isMissingAdminUsersTable(adminUserResult.error)) {
    throw new Error(adminUserResult.error.message);
  }

  if (!adminUserResult.error) {
    const adminUser =
      (adminUserResult.data as
        | {
            full_name: string | null;
            is_active: boolean | null;
            role: string | null;
          }
        | null) ?? null;

    if (!adminUser || adminUser.is_active === false || !isAdminRole(adminUser.role)) {
      return null;
    }

    return {
      fullName: adminUser.full_name,
      role: adminUser.role
    } satisfies AdminAccessRecord;
  }

  return getFallbackProfileAdminAccess(userId);
}

async function touchAdminLastLogin(userId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("admin_users")
    .update({
      last_login: new Date().toISOString()
    })
    .eq("id", userId);

  if (result.error && !isMissingAdminUsersTable(result.error)) {
    throw new Error(result.error.message);
  }
}

function hasRequiredRole(currentRole: AdminRole, requiredRole?: AdminRole | AdminRole[]) {
  if (!requiredRole) {
    return true;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(currentRole);
  }

  return currentRole === requiredRole || currentRole === ADMIN_ROLES[0];
}

export async function signInAdmin(
  email: string,
  password: string
): Promise<AdminSignInResult> {
  const supabase = createAdminSupabaseServerClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInResult.error) {
    clearAdminSessionCookie();
    return {
      error: signInResult.error.message,
      success: false
    };
  }

  const user = signInResult.data.user;

  if (!user) {
    await supabase.auth.signOut();
    clearAdminSessionCookie();
    return {
      error: "Unable to establish an admin session.",
      success: false
    };
  }

  const access = await getAdminAccessRecord(user.id);

  if (!access) {
    await supabase.auth.signOut();
    clearAdminSessionCookie();
    return {
      error: "Not authorized as admin",
      success: false
    };
  }

  setAdminSessionCookie(user.id, access.role);
  await touchAdminLastLogin(user.id);

  return {
    role: access.role,
    success: true
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const supabase = createAdminSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return null;
  }

  const expectedUserId = getCookieUserId(sessionCookie);

  if (!expectedUserId || expectedUserId !== user.id) {
    return null;
  }

  const access = await getAdminAccessRecord(user.id);

  if (!access) {
    return null;
  }

  return {
    fullName: access.fullName,
    role: access.role,
    user
  };
}

export async function signOutAdmin() {
  const supabase = createAdminSupabaseServerClient();
  await supabase.auth.signOut();
  clearAdminSessionCookie();
  redirect("/admin-login");
}

export async function requireAdminSession(requiredRole?: AdminRole | AdminRole[]) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin-login");
  }

  if (!hasRequiredRole(session.role, requiredRole)) {
    throw new AdminAuthorizationError("Insufficient admin role.");
  }

  return session;
}
