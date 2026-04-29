import "server-only";

import {PERMISSIONS, hasPermission} from "@/lib/permissions";
import {createAdminAuditLog} from "@/server/admin/audit";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";
import {type AdminStaffIdentity} from "@/features/admin/types";
import type {
  AdminDataRequestFilters,
  AdminDataRequestItem,
  AdminPagination
} from "@/features/admin/types";
import type {PrivacyDataRequestRecord} from "@/features/account/types";
import {type DataRequestStatus, type DataRequestType} from "@/types/database-enums";

import {buildUserDeletionPlan} from "./deletion-service";
import {getUserDataInventories} from "./export-service";
import {asRecord, toTerminalDataRequestTimestamp} from "./utils";

type DataRequestRow = {
  assigned_admin_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  rejected_reason: string | null;
  request_details: Json;
  request_type: DataRequestType;
  requested_email: string;
  response_summary: string | null;
  status: DataRequestStatus;
  updated_at: string;
  user_id: string | null;
};

type ProfileRow = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string;
};

function buildPagination(totalCount: number, page: number, pageSize: number): AdminPagination {
  const pageCount = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);

  return {
    page,
    pageCount,
    pageSize,
    totalCount
  };
}

function buildName(profile: ProfileRow | null, fallback: string) {
  if (!profile) {
    return fallback;
  }

  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : profile.email;
}

export async function createDataRequestForUser({
  details,
  requestedEmail,
  requestType,
  userId
}: {
  details: Record<string, unknown>;
  requestedEmail: string;
  requestType: Extract<DataRequestType, "erasure" | "portability">;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const existing = await admin
    .from("data_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("request_type", requestType)
    .in("status", ["submitted", "verifying_identity", "in_progress"])
    .limit(1)
    .maybeSingle();

  if ((existing.data as {id: string} | null)?.id) {
    throw new Error("There is already an active request of this type in progress.");
  }

  const insertResult = await admin
    .from("data_requests")
    .insert({
      request_details: details as Json,
      request_type: requestType,
      requested_email: requestedEmail,
      user_id: userId
    })
    .select("id")
    .maybeSingle();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return (insertResult.data as {id: string} | null)?.id ?? null;
}

export async function listDataRequestsForUser(userId: string): Promise<PrivacyDataRequestRecord[]> {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("data_requests")
    .select(
      "id, request_type, status, request_details, response_summary, rejected_reason, created_at, completed_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", {ascending: false});
  const rows = (result.data as DataRequestRow[] | null) ?? [];

  return rows.map((row) => ({
    completedAt: row.completed_at,
    createdAt: row.created_at,
    id: row.id,
    rejectedReason: row.rejected_reason,
    requestDetails: asRecord(row.request_details),
    requestType: row.request_type,
    responseSummary: row.response_summary,
    status: row.status
  }));
}

export async function listAdminDataRequests(filters: AdminDataRequestFilters): Promise<{
  items: AdminDataRequestItem[];
  pagination: AdminPagination;
}> {
  const admin = createSupabaseAdminClient();
  const pageSize = 12;
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("data_requests")
    .select(
      "id, user_id, assigned_admin_user_id, request_type, status, requested_email, request_details, response_summary, rejected_reason, created_at, completed_at, updated_at",
      {count: "exact"}
    )
    .order("created_at", {ascending: false});

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.type) {
    query = query.eq("request_type", filters.type);
  }

  if (filters.query) {
    query = query.ilike("requested_email", `%${filters.query}%`);
  }

  const result = await query.range(from, to);
  const rows = (result.data as DataRequestRow[] | null) ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value))));
  const assignedAdminIds = Array.from(
    new Set(rows.map((row) => row.assigned_admin_user_id).filter((value): value is string => Boolean(value)))
  );
  const allProfileIds = Array.from(new Set([...userIds, ...assignedAdminIds]));
  const [profilesResult, inventories, deletionPlans] = await Promise.all([
    allProfileIds.length > 0
      ? admin
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", allProfileIds)
      : {data: []},
    getUserDataInventories(userIds),
    Promise.all(userIds.map(async (userId) => [userId, await buildUserDeletionPlan(userId)] as const))
  ]);
  const profileMap = new Map(
    (((profilesResult.data as ProfileRow[] | null) ?? []).map((profile) => [
      profile.user_id,
      profile
    ]) as Array<[string, ProfileRow]>)
  );
  const deletionPlanMap = new Map(deletionPlans);

  return {
    items: rows.map((row) => {
      const customerProfile = row.user_id ? profileMap.get(row.user_id) ?? null : null;
      const assignedAdmin = row.assigned_admin_user_id
        ? profileMap.get(row.assigned_admin_user_id) ?? null
        : null;
      const inventory = row.user_id ? inventories.get(row.user_id) ?? null : null;
      const deletionPlan = row.user_id ? deletionPlanMap.get(row.user_id) ?? null : null;

      return {
        assignedAdminLabel: assignedAdmin
          ? buildName(assignedAdmin, assignedAdmin.email)
          : null,
        assignedAdminUserId: row.assigned_admin_user_id,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        customerEmail: customerProfile?.email ?? row.requested_email,
        customerName: buildName(customerProfile, row.requested_email),
        id: row.id,
        rejectedReason: row.rejected_reason,
        requestDetails: asRecord(row.request_details),
        requestType: row.request_type,
        responseSummary: row.response_summary,
        status: row.status,
        summary:
          inventory && deletionPlan
            ? {
                bookingsCount: inventory.bookingsCount,
                financeRecordsCount: inventory.financeRecordsCount,
                retentionFlags: deletionPlan.retentionExceptionHooks.slice(0, 2),
                travelerProfilesCount: inventory.travelerProfilesCount,
                uploadsCount: inventory.uploadsCount,
                visaApplicationsCount: inventory.visaApplicationsCount
              }
            : null,
        userId: row.user_id
      };
    }),
    pagination: buildPagination(result.count ?? 0, page, pageSize)
  };
}

export async function updateAdminDataRequest({
  actor,
  assignedAdminUserId,
  rejectedReason,
  requestId,
  responseSummary,
  status
}: {
  actor: AdminStaffIdentity;
  assignedAdminUserId?: string | null;
  rejectedReason?: string | null;
  requestId: string;
  responseSummary?: string | null;
  status: DataRequestStatus;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.privacyManage)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const updateResult = await admin
    .from("data_requests")
    .update({
      assigned_admin_user_id: assignedAdminUserId ?? null,
      completed_at: toTerminalDataRequestTimestamp(status),
      rejected_reason: rejectedReason ?? null,
      response_summary: responseSummary ?? null,
      status
    })
    .eq("id", requestId)
    .select("id, user_id")
    .maybeSingle();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  await createAdminAuditLog({
    action: "data_request.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: requestId,
    entityType: "data_request",
    metadata: {
      assignedAdminUserId: assignedAdminUserId ?? null,
      rejectedReason: rejectedReason ?? null,
      responseSummary: responseSummary ?? null,
      status
    },
    targetUserId: (updateResult.data?.user_id as string | undefined) ?? null
  });
}
