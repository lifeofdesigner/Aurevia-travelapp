import "server-only";

import {type User} from "@supabase/supabase-js";
import {type NextRequest} from "next/server";

import {
  isAdminRole,
  mapAdminRoleToLegacyRole,
  type AdminRole
} from "@/lib/auth/admin-auth-config";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {
  getSetupRuntimeConfig,
  getSetupSecretFromRequest,
  isValidSetupSecret
} from "@/server/setup/config";
import {type UserRole} from "@/types/database-enums";

export type SetupUserRole = AdminRole | "customer";

type SetupProfileRow = {
  created_at: string | null;
  email: string | null;
  first_name: string | null;
  is_suspended: boolean | null;
  last_name: string | null;
  role: UserRole | null;
  user_id: string;
};

type SetupAdminUserRow = {
  created_at: string | null;
  email: string;
  full_name: string | null;
  id: string;
  is_active: boolean | null;
  role: string | null;
};

export type SetupUserRecord = {
  authCreatedAt: string | null;
  email: string;
  fullName: string | null;
  id: string;
  isActive: boolean;
  role: SetupUserRole;
};

export type SetupUserListResponse = {
  counts: {
    adminUsersCount: number;
    authUsersCount: number;
    profilesCount: number;
  };
  users: SetupUserRecord[];
};

export class SetupRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SetupRequestError";
    this.status = status;
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim();
  const [firstName, ...rest] = normalized.split(/\s+/);

  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

function joinFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const value = [firstName, lastName].filter(Boolean).join(" ").trim();
  return value || null;
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

function ensureAdminUsersTable(error: unknown) {
  if (isMissingAdminUsersTable(error)) {
    throw new SetupRequestError(
      "admin_users table is missing. Run the latest Supabase migrations before using setup.",
      400
    );
  }
}

function mapProfileRoleToSetupRole(role: UserRole | null | undefined): SetupUserRole {
  switch (role) {
    case "owner":
      return "super_admin";
    case "admin":
      return "admin";
    case "support":
      return "support";
    default:
      return "customer";
  }
}

function mapSetupRoleToProfileRole(role: SetupUserRole): UserRole {
  if (role === "customer") {
    return "customer";
  }

  return mapAdminRoleToLegacyRole(role);
}

function getAuthUserMetadataFullName(user: User) {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" ? normalizeOptionalString(fullName) ?? null : null;
}

function buildSetupUserRecord(
  authUser: User,
  profile: SetupProfileRow | null,
  adminUser: SetupAdminUserRow | null
): SetupUserRecord {
  const derivedRole =
    adminUser && isAdminRole(adminUser.role)
      ? adminUser.role
      : mapProfileRoleToSetupRole(profile?.role);
  const fullName =
    adminUser?.full_name ??
    joinFullName(profile?.first_name, profile?.last_name) ??
    getAuthUserMetadataFullName(authUser);
  const email =
    authUser.email ??
    adminUser?.email ??
    profile?.email ??
    "";
  const isActive =
    adminUser
      ? adminUser.is_active !== false && profile?.is_suspended !== true
      : profile?.is_suspended !== true;

  return {
    authCreatedAt:
      normalizeOptionalString(authUser.created_at) ??
      normalizeOptionalString(profile?.created_at) ??
      normalizeOptionalString(adminUser?.created_at) ??
      null,
    email,
    fullName,
    id: authUser.id,
    isActive,
    role: derivedRole
  };
}

async function listAllAuthUsers() {
  const admin = createSupabaseAdminClient();
  const users: User[] = [];
  let nextPage: number | null = 1;
  let total = 0;

  while (nextPage) {
    const result = await admin.auth.admin.listUsers({
      page: nextPage,
      perPage: 200
    });

    if (result.error) {
      throw new SetupRequestError(result.error.message, 400);
    }

    users.push(...result.data.users);
    total = typeof result.data.total === "number" && result.data.total > 0
      ? result.data.total
      : Math.max(total, users.length);
    nextPage = result.data.nextPage;

    if (result.data.users.length === 0) {
      break;
    }
  }

  return {
    total: total || users.length,
    users
  };
}

async function getCounts() {
  const admin = createSupabaseAdminClient();
  const [profilesResult, adminUsersResult] = await Promise.all([
    admin.from("profiles").select("user_id", {count: "exact", head: true}),
    admin.from("admin_users").select("id", {count: "exact", head: true})
  ]);

  if (profilesResult.error) {
    throw new SetupRequestError(profilesResult.error.message, 400);
  }

  if (adminUsersResult.error) {
    ensureAdminUsersTable(adminUsersResult.error);
    throw new SetupRequestError(adminUsersResult.error.message, 400);
  }

  return {
    adminUsersCount: adminUsersResult.count ?? 0,
    profilesCount: profilesResult.count ?? 0
  };
}

export function requireSetupAccess(request: NextRequest | Request) {
  const config = getSetupRuntimeConfig();

  if (!config.enabled || !config.hasSecret) {
    throw new SetupRequestError("Setup is disabled.", 403);
  }

  const secretKey = getSetupSecretFromRequest(request);

  if (!isValidSetupSecret(secretKey)) {
    throw new SetupRequestError("Invalid setup secret key.", 403);
  }
}

export async function listSetupUsers(): Promise<SetupUserListResponse> {
  const admin = createSupabaseAdminClient();
  const authDirectory = await listAllAuthUsers();
  const counts = await getCounts();
  const userIds = authDirectory.users.map((user) => user.id);

  let profiles: SetupProfileRow[] = [];
  let adminUsers: SetupAdminUserRow[] = [];

  if (userIds.length > 0) {
    const [profilesResult, adminUsersResult] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, role, created_at, is_suspended")
        .in("user_id", userIds),
      admin
        .from("admin_users")
        .select("id, email, full_name, role, is_active, created_at")
        .in("id", userIds)
    ]);

    if (profilesResult.error) {
      throw new SetupRequestError(profilesResult.error.message, 400);
    }

    if (adminUsersResult.error) {
      ensureAdminUsersTable(adminUsersResult.error);
      throw new SetupRequestError(adminUsersResult.error.message, 400);
    }

    profiles = (profilesResult.data as SetupProfileRow[] | null) ?? [];
    adminUsers = (adminUsersResult.data as SetupAdminUserRow[] | null) ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const adminMap = new Map(adminUsers.map((adminUser) => [adminUser.id, adminUser]));

  return {
    counts: {
      ...counts,
      authUsersCount: authDirectory.total
    },
    users: authDirectory.users
      .map((user) => buildSetupUserRecord(user, profileMap.get(user.id) ?? null, adminMap.get(user.id) ?? null))
      .sort((left, right) => {
        const leftTime = left.authCreatedAt ? new Date(left.authCreatedAt).getTime() : 0;
        const rightTime = right.authCreatedAt ? new Date(right.authCreatedAt).getTime() : 0;
        return rightTime - leftTime;
      })
  };
}

export async function createSetupUser(input: {
  email: string;
  fullName: string;
  kind: "admin" | "customer";
  password: string;
  phone?: string | null;
  role?: AdminRole;
}) {
  const email = normalizeOptionalString(input.email);
  const fullName = normalizeOptionalString(input.fullName);
  const password = input.password;
  const phone = normalizeOptionalString(input.phone ?? undefined) ?? null;
  const role = input.role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SetupRequestError("Enter a valid email address.", 400);
  }

  if (!fullName) {
    throw new SetupRequestError("Full name is required.", 400);
  }

  if (password.length < 8) {
    throw new SetupRequestError("Password must be at least 8 characters.", 400);
  }

  if (input.kind === "admin" && !role) {
    throw new SetupRequestError("Choose an admin role before creating the user.", 400);
  }

  if (role && !isAdminRole(role)) {
    throw new SetupRequestError("Invalid admin role provided.", 400);
  }

  const admin = createSupabaseAdminClient();
  const {firstName, lastName} = splitFullName(fullName);
  const legacyRole = mapSetupRoleToProfileRole(
    input.kind === "admin" && role ? role : "customer"
  );

  const authResult = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      first_name: firstName,
      full_name: fullName,
      last_name: lastName
    }
  });

  if (authResult.error) {
    const message =
      authResult.error.message.includes("already") || authResult.error.message.includes("exists")
        ? "A user with that email already exists."
        : authResult.error.message;
    throw new SetupRequestError(message, 400);
  }

  const user = authResult.data.user;

  if (!user) {
    throw new SetupRequestError("Unable to create the auth user.", 400);
  }

  try {
    const profileResult = await admin.from("profiles").upsert(
      {
        email,
        first_name: firstName,
        is_suspended: false,
        last_name: lastName,
        phone: input.kind === "customer" ? phone : null,
        role: legacyRole,
        user_id: user.id
      },
      {
        onConflict: "user_id"
      }
    );

    if (profileResult.error) {
      throw new SetupRequestError(profileResult.error.message, 400);
    }

    if (input.kind === "admin" && role) {
      const adminUserResult = await admin.from("admin_users").upsert(
        {
          created_by: null,
          email,
          full_name: fullName,
          id: user.id,
          is_active: true,
          role
        },
        {
          onConflict: "id"
        }
      );

      if (adminUserResult.error) {
        ensureAdminUsersTable(adminUserResult.error);
        throw new SetupRequestError(adminUserResult.error.message, 400);
      }
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(user.id);

    if (error instanceof SetupRequestError) {
      throw error;
    }

    throw new SetupRequestError("Unable to finish provisioning the user.", 400);
  }

  return {
    userId: user.id
  };
}

export async function updateSetupUser(input: {
  isActive?: boolean;
  role?: SetupUserRole;
  userId: string;
}) {
  const userId = normalizeOptionalString(input.userId);

  if (!userId) {
    throw new SetupRequestError("User ID is required.", 400);
  }

  if (typeof input.isActive !== "boolean" && !input.role) {
    throw new SetupRequestError("Provide a role or activation change to update the user.", 400);
  }

  if (input.role && input.role !== "customer" && !isAdminRole(input.role)) {
    throw new SetupRequestError("Invalid role provided.", 400);
  }

  const admin = createSupabaseAdminClient();
  const [authUserResult, profileResult, adminUserResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, role, created_at, is_suspended")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("admin_users")
      .select("id, email, full_name, role, is_active, created_at")
      .eq("id", userId)
      .maybeSingle()
  ]);

  if (authUserResult.error || !authUserResult.data.user) {
    throw new SetupRequestError("User not found.", 404);
  }

  if (profileResult.error) {
    throw new SetupRequestError(profileResult.error.message, 400);
  }

  if (adminUserResult.error) {
    ensureAdminUsersTable(adminUserResult.error);
    throw new SetupRequestError(adminUserResult.error.message, 400);
  }

  const authUser = authUserResult.data.user;
  const profile = (profileResult.data as SetupProfileRow | null) ?? null;
  const adminUser = (adminUserResult.data as SetupAdminUserRow | null) ?? null;
  const currentRecord = buildSetupUserRecord(authUser, profile, adminUser);
  const nextRole = input.role ?? currentRecord.role;
  const nextIsActive = typeof input.isActive === "boolean" ? input.isActive : currentRecord.isActive;
  const fullName =
    adminUser?.full_name ??
    joinFullName(profile?.first_name, profile?.last_name) ??
    getAuthUserMetadataFullName(authUser) ??
    authUser.email ??
    "Setup User";
  const {firstName, lastName} = splitFullName(fullName);
  const email =
    authUser.email ??
    adminUser?.email ??
    profile?.email ??
    "";

  const nextProfileRole = mapSetupRoleToProfileRole(nextRole);
  const profileUpdateResult = await admin.from("profiles").upsert(
    {
      email,
      first_name: firstName,
      is_suspended: !nextIsActive,
      last_name: lastName,
      role: nextProfileRole,
      user_id: userId
    },
    {
      onConflict: "user_id"
    }
  );

  if (profileUpdateResult.error) {
    throw new SetupRequestError(profileUpdateResult.error.message, 400);
  }

  if (nextRole === "customer") {
    const deleteAdminUserResult = await admin.from("admin_users").delete().eq("id", userId);

    if (deleteAdminUserResult.error) {
      ensureAdminUsersTable(deleteAdminUserResult.error);
      throw new SetupRequestError(deleteAdminUserResult.error.message, 400);
    }

    return;
  }

  const upsertAdminUserResult = await admin.from("admin_users").upsert(
    {
      email,
      full_name: fullName,
      id: userId,
      is_active: nextIsActive,
      role: nextRole
    },
    {
      onConflict: "id"
    }
  );

  if (upsertAdminUserResult.error) {
    ensureAdminUsersTable(upsertAdminUserResult.error);
    throw new SetupRequestError(upsertAdminUserResult.error.message, 400);
  }
}

export async function deleteSetupUser(userIdValue: string) {
  const userId = normalizeOptionalString(userIdValue);

  if (!userId) {
    throw new SetupRequestError("User ID is required.", 400);
  }

  const admin = createSupabaseAdminClient();
  const deleteResult = await admin.auth.admin.deleteUser(userId);

  if (deleteResult.error) {
    throw new SetupRequestError(deleteResult.error.message, 400);
  }
}
