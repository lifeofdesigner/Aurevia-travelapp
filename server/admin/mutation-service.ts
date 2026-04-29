import "server-only";

import {PERMISSIONS, hasPermission} from "@/lib/permissions";
import {defaultLocale, isSupportedLocale, type Locale} from "@/lib/i18n/routing";
import {reportServerError} from "@/server/observability/logger";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {createAdminAuditLog} from "@/server/admin/audit";
import {type Json} from "@/types/supabase";
import {type VisaApplicationStatus} from "@/types/database-enums";
import {sendVisaStatusUpdateEmail} from "@/server/email/transactional";
import {type AdminResourceKey, type AdminStaffIdentity} from "@/features/admin/types";

type ResourceMutationDefinition = {
  idKey: string;
  softDelete?: true;
  table: string;
};

const RESOURCE_MUTATION_TABLES: Record<AdminResourceKey, ResourceMutationDefinition> = {
  airlines: {idKey: "id", table: "airlines"},
  airports: {idKey: "id", table: "airports"},
  coupons: {
    idKey: "id",
    softDelete: true,
    table: "coupons"
  },
  customers: {idKey: "user_id", table: "profiles"},
  destinations: {idKey: "id", table: "destinations"},
  "featured-content": {idKey: "id", table: "featured_content"},
  legal: {idKey: "id", table: "legal_documents"},
  settings: {idKey: "id", table: "site_settings"},
  suppliers: {idKey: "id", table: "suppliers"},
  "visa-products": {
    idKey: "id",
    softDelete: true,
    table: "visa_products"
  }
};

function asJsonRecord(input: Record<string, unknown>) {
  return input as Record<string, Json | string | number | boolean | null>;
}

function normalizeDateTimeValue(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value.includes("T") ? new Date(value).toISOString() : value;
}

function normalizePayload(resource: AdminResourceKey, values: Record<string, unknown>) {
  const payload = {...values};

  for (const key of [
    "effective_at",
    "published_at",
    "publish_starts_at",
    "publish_ends_at",
    "starts_at",
    "ends_at"
  ]) {
    if (key in payload) {
      payload[key] = normalizeDateTimeValue(payload[key]);
    }
  }

  if (resource === "customers") {
    return {
      ...payload,
      deleted_at: null
    };
  }

  if (resource === "coupons" && payload.discount_type === "percentage") {
    payload.amount_minor = null;
    payload.currency_code = null;
  }

  if (resource === "coupons" && payload.discount_type === "fixed_amount") {
    payload.percentage_bps = null;
  }

  if (resource === "legal" && payload.publication_status !== "published") {
    payload.published_at = null;
  }

  return payload;
}

function getResultStringValue(row: unknown, key: string) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const value = (row as Record<string, Json | string | number | boolean | null>)[key];
  return typeof value === "string" ? value : null;
}

async function clearCurrentLegalDocument({
  documentKey,
  id,
  locale
}: {
  documentKey: string;
  id?: string;
  locale: string;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("legal_documents")
    .update({is_current: false})
    .eq("document_key", documentKey)
    .eq("locale", locale);

  if (id) {
    query = query.neq("id", id);
  }

  await query;
}

function toLocale(value: unknown): Locale {
  return typeof value === "string" && isSupportedLocale(value) ? value : defaultLocale;
}

function buildVisaStatusEmailContent(
  status: VisaApplicationStatus,
  locale: Locale
) {
  if (status === "approved") {
    return {
      explanation:
        locale === "de"
          ? "Ihr Visa-Antrag wurde genehmigt."
          : "Your visa application has been approved.",
      nextSteps:
        locale === "de"
          ? [
              "Pruefen Sie Ihr Dashboard auf weitere Hinweise unseres Teams.",
              "Bereiten Sie Ihre Reiseunterlagen fuer die Abreise vor."
            ]
          : [
              "Check your dashboard for any final notes from our team.",
              "Prepare your travel documents for departure."
            ],
      requiredDocuments: [] as const,
      statusLabel: locale === "de" ? "Genehmigt" : "Approved"
    };
  }

  if (status === "rejected") {
    return {
      explanation:
        locale === "de"
          ? "Ihr Visa-Antrag wurde leider abgelehnt."
          : "Your visa application was not approved at this stage.",
      nextSteps:
        locale === "de"
          ? [
              "Pruefen Sie Ihr Dashboard auf weitere Hinweise.",
              "Kontaktieren Sie den Support, wenn Sie eine erneute Einreichung besprechen moechten."
            ]
          : [
              "Review your dashboard for any follow-up notes.",
              "Contact support if you would like to discuss a fresh submission."
            ],
      requiredDocuments: [] as const,
      statusLabel: locale === "de" ? "Abgelehnt" : "Rejected"
    };
  }

  if (status === "needs_changes" || status === "action_required") {
    return {
      explanation:
        locale === "de"
          ? "Wir benoetigen noch einige Angaben oder korrigierte Dokumente, bevor wir fortfahren koennen."
          : "We need a few updates before we can continue processing your application.",
      nextSteps:
        locale === "de"
          ? [
              "Oeffnen Sie Ihr Dashboard, um die offenen Punkte zu sehen.",
              "Laden Sie die angeforderten Unterlagen hoch und speichern Sie Ihre Aktualisierung."
            ]
          : [
              "Open your dashboard to review the outstanding checklist items.",
              "Upload the requested documents and save your update."
            ],
      requiredDocuments:
        locale === "de"
          ? ["Pruefen Sie die Anforderungsliste in Ihrem Dashboard."]
          : ["Review the requested checklist items in your dashboard."],
      statusLabel: locale === "de" ? "Aenderungen erforderlich" : "Needs changes"
    };
  }

  if (status === "in_review") {
    return {
      explanation:
        locale === "de"
          ? "Ihr Visa-Antrag wird derzeit von unserem Team geprueft."
          : "Your visa application is currently being reviewed by our team.",
      nextSteps:
        locale === "de"
          ? [
              "Wir benachrichtigen Sie, sobald ein weiterer Schritt erforderlich ist.",
              "Behalten Sie Ihr Dashboard fuer neue Hinweise im Blick."
            ]
          : [
              "We will email you as soon as any action is required.",
              "Keep an eye on your dashboard for progress updates."
            ],
      requiredDocuments: [] as const,
      statusLabel: locale === "de" ? "In Pruefung" : "In review"
    };
  }

  if (status === "cancelled" || status === "withdrawn") {
    return {
      explanation:
        locale === "de"
          ? "Dieser Visa-Antrag ist nicht mehr aktiv."
          : "This visa application is no longer active.",
      nextSteps:
        locale === "de"
          ? [
              "Kontaktieren Sie den Support, wenn Sie einen neuen Antrag starten moechten."
            ]
          : [
              "Contact support if you would like to start a new application."
            ],
      requiredDocuments: [] as const,
      statusLabel: locale === "de" ? "Geschlossen" : "Closed"
    };
  }

  return {
    explanation:
      locale === "de"
        ? "Ihr Visa-Antrag hat ein neues Update erhalten."
        : "Your visa application has received a new update.",
    nextSteps:
      locale === "de"
        ? [
            "Wir informieren Sie, sobald ein weiterer Schritt erforderlich ist.",
            "Sie koennen den aktuellen Stand jederzeit in Ihrem Dashboard verfolgen."
          ]
        : [
            "We will reach out if any action is required.",
            "You can track the latest progress at any time from your dashboard."
          ],
    requiredDocuments: [] as const,
    statusLabel: locale === "de" ? "Aktualisiert" : "Updated"
  };
}

export async function saveAdminResourceRecord({
  actor,
  id,
  resource,
  values
}: {
  actor: AdminStaffIdentity;
  id?: string;
  resource: AdminResourceKey;
  values: Record<string, unknown>;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.settingsManage) && resource !== "customers") {
    throw new Error("Forbidden.");
  }

  if (resource === "customers" && !hasPermission(actor.role, PERMISSIONS.adminAccess)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const definition = RESOURCE_MUTATION_TABLES[resource];
  const payload = normalizePayload(resource, values);

  if (resource === "customers" && actor.role !== "owner" && payload.role === "owner") {
    throw new Error("Only owners can promote another account to owner.");
  }

  if (resource === "legal" && payload.is_current === true) {
    await clearCurrentLegalDocument({
      documentKey: String(payload.document_key),
      id,
      locale: String(payload.locale)
    });
  }

  let entityId = id ?? null;

  if (id) {
    const updateResult = await admin
      .from(definition.table)
      .update(asJsonRecord(payload))
      .eq(definition.idKey, id)
      .select(definition.idKey)
      .maybeSingle();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    entityId = getResultStringValue(updateResult.data ?? null, definition.idKey) ?? id;
  } else {
    const insertResult = await admin
      .from(definition.table)
      .insert(asJsonRecord(payload))
      .select(definition.idKey)
      .maybeSingle();

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }

    entityId = getResultStringValue(insertResult.data ?? null, definition.idKey);
  }

  await createAdminAuditLog({
    action: `${resource}.${id ? "updated" : "created"}`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId,
    entityType: resource,
    targetUserId: resource === "customers" ? entityId : null
  });

  return {id: entityId};
}

export async function deleteAdminResourceRecord({
  actor,
  id,
  resource
}: {
  actor: AdminStaffIdentity;
  id: string;
  resource: AdminResourceKey;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.settingsManage) || resource === "customers") {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const definition = RESOURCE_MUTATION_TABLES[resource];

  if (resource === "legal") {
    const lookup = await admin
      .from("legal_documents")
      .select("is_current")
      .eq("id", id)
      .maybeSingle();

    if ((lookup.data as {is_current?: boolean} | null)?.is_current) {
      throw new Error("Current legal documents must be archived or replaced before deletion.");
    }
  }

  if (definition.softDelete) {
    const updateResult = await admin
      .from(definition.table)
      .update(
        resource === "coupons"
          ? {
              deleted_at: new Date().toISOString(),
              is_active: false
            }
          : {
              deleted_at: new Date().toISOString()
            }
      )
      .eq(definition.idKey, id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  } else {
    const deleteResult = await admin.from(definition.table).delete().eq(definition.idKey, id);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
  }

  await createAdminAuditLog({
    action: `${resource}.deleted`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: id,
    entityType: resource
  });
}

export async function deleteExpiredCoupons({
  actor
}: {
  actor: AdminStaffIdentity;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.settingsManage)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const lookup = await admin
    .from("coupons")
    .select("id")
    .is("deleted_at", null)
    .not("ends_at", "is", null)
    .lt("ends_at", now);
  const expiredIds = (((lookup.data as Array<{id: string}> | null) ?? []).map((row) => row.id) ?? []);

  if (expiredIds.length === 0) {
    return {deletedCount: 0};
  }

  const deleteResult = await admin
    .from("coupons")
    .update({
      deleted_at: now,
      is_active: false
    })
    .in("id", expiredIds);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  await createAdminAuditLog({
    action: "coupons.expired.deleted",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "coupons",
    metadata: {
      deletedCount: expiredIds.length
    }
  });

  return {deletedCount: expiredIds.length};
}

export async function createBookingAdminNote({
  actor,
  entityId,
  entityType,
  isVisibleToCustomer,
  noteBody,
  title
}: {
  actor: AdminStaffIdentity;
  entityId?: string | null;
  entityType: string;
  isVisibleToCustomer: boolean;
  noteBody: string;
  title?: string | null;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.bookingManageAll)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const noteInsert = await admin
    .from("admin_notes")
    .insert({
      author_user_id: actor.userId,
      entity_id: entityId ?? null,
      entity_type: entityType,
      is_visible_to_customer: isVisibleToCustomer,
      note_body: noteBody,
      title: title ?? null
    })
    .select("id")
    .maybeSingle();

  if (noteInsert.error) {
    throw new Error(noteInsert.error.message);
  }

  await createAdminAuditLog({
    action: "admin_note.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: entityId ?? null,
    entityType,
    metadata: {
      visibleToCustomer: isVisibleToCustomer
    }
  });

  return noteInsert.data;
}

export async function updateVisaApplicationReview({
  actor,
  applicationId,
  reviewedAt,
  status
}: {
  actor: AdminStaffIdentity;
  applicationId: string;
  reviewedAt?: string | null;
  status: VisaApplicationStatus;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.visaReview)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const currentResult = await admin
    .from("visa_applications")
    .select("id, applicant_user_id, application_reference, visa_country_code, status")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  const currentApplication =
    (currentResult.data as
      | {
          applicant_user_id: string;
          application_reference: string | null;
          id: string;
          status: VisaApplicationStatus;
          visa_country_code: string;
        }
      | null) ?? null;

  if (!currentApplication) {
    throw new Error("Visa application not found.");
  }

  const now = new Date().toISOString();
  const decidedStatuses = new Set(["approved", "cancelled", "rejected", "withdrawn"]);
  const reviewResult = await admin
    .from("visa_applications")
    .update({
      decided_at: decidedStatuses.has(status) ? now : null,
      reviewed_at: reviewedAt ?? now,
      status
    })
    .eq("id", currentApplication.id)
    .is("deleted_at", null)
    .select("id, applicant_user_id")
    .maybeSingle();

  if (reviewResult.error) {
    throw new Error(reviewResult.error.message);
  }

  await createAdminAuditLog({
    action: "visa_application.reviewed",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: applicationId,
    entityType: "visa_application",
    metadata: {status},
    targetUserId: (reviewResult.data?.applicant_user_id as string | undefined) ?? null
  });

  if (currentApplication.status === status) {
    return;
  }

  try {
    const applicantResult = await admin
      .from("profiles")
      .select("email, first_name, preferred_locale")
      .eq("user_id", currentApplication.applicant_user_id)
      .maybeSingle();
    const applicant =
      (applicantResult.data as
        | {
            email: string;
            first_name: string | null;
            preferred_locale: string | null;
          }
        | null) ?? null;

    if (!applicant?.email) {
      return;
    }

    const locale = toLocale(applicant.preferred_locale);
    const emailContent = buildVisaStatusEmailContent(status, locale);

    await sendVisaStatusUpdateEmail({
      applicationReference:
        currentApplication.application_reference ?? currentApplication.id,
      explanation: emailContent.explanation,
      locale,
      nextSteps: emailContent.nextSteps,
      requiredDocuments: emailContent.requiredDocuments,
      statusLabel: emailContent.statusLabel,
      to: applicant.email
    });
  } catch (error) {
    reportServerError("visa.status_email_failed", error, {
      applicationId: currentApplication.id,
      status
    });
  }
}

export async function updateSupportTicketByAdmin({
  actor,
  assignedAdminUserId,
  priority,
  status,
  ticketId
}: {
  actor: AdminStaffIdentity;
  assignedAdminUserId?: string | null;
  priority: string;
  status: string;
  ticketId: string;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.bookingManageAll)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const updateResult = await admin
    .from("support_tickets")
    .update({
      assigned_admin_user_id: assignedAdminUserId ?? null,
      priority,
      status
    })
    .eq("id", ticketId)
    .is("deleted_at", null)
    .select("id, owner_user_id")
    .maybeSingle();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  await createAdminAuditLog({
    action: "support_ticket.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: ticketId,
    entityType: "support_ticket",
    metadata: {
      assignedAdminUserId: assignedAdminUserId ?? null,
      priority,
      status
    },
    targetUserId: (updateResult.data?.owner_user_id as string | undefined) ?? null
  });
}
