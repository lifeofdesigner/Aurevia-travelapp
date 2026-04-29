import "server-only";

import {type Json} from "@/types/supabase";
import {logServerEvent, reportServerError} from "@/server/observability/logger";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

export async function createFinanceAuditLog({
  action,
  entityId,
  entityType,
  metadata,
  targetUserId
}: {
  action: string;
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  const result = await admin.from("audit_logs").insert({
    action,
    entity_id: entityId ?? null,
    entity_type: entityType,
    metadata: (metadata ?? {}) as Json,
    target_user_id: targetUserId ?? null
  });

  if (result.error) {
    reportServerError("finance.audit_log.insert_failed", result.error, {
      action,
      entityId,
      entityType,
      targetUserId
    });
    return;
  }

  logServerEvent("finance.audit_log.inserted", {
    action,
    entityId,
    entityType,
    targetUserId
  });
}

export async function hasFinanceAuditAction({
  action,
  entityId,
  entityType
}: {
  action: string;
  entityId: string;
  entityType: string;
}) {
  const admin = createSupabaseAdminClient();
  const auditResult = await admin
    .from("audit_logs")
    .select("id")
    .eq("action", action)
    .eq("entity_id", entityId)
    .eq("entity_type", entityType)
    .limit(1)
    .maybeSingle();

  return Boolean(auditResult.data);
}
