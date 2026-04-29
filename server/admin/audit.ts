import "server-only";

import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type UserRole} from "@/types/database-enums";
import {type Json} from "@/types/supabase";

export async function createAdminAuditLog({
  action,
  actorRole,
  actorUserId,
  entityId,
  entityType,
  metadata,
  targetUserId
}: {
  action: string;
  actorRole: UserRole;
  actorUserId: string;
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  await admin.from("audit_logs").insert({
    action,
    actor_role: actorRole,
    actor_user_id: actorUserId,
    entity_id: entityId ?? null,
    entity_type: entityType,
    metadata: (metadata ?? {}) as Json,
    target_user_id: targetUserId ?? null
  });
}
