import "server-only";

import JSZip from "jszip";

import {hasPermission, PERMISSIONS} from "@/lib/permissions";
import {getSiteBranding} from "@/server/brand/site-branding";
import {createEmailProvider} from "@/server/email/provider";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type VisaApplicationStatus} from "@/types/database-enums";

import {createAdminAuditLog} from "./audit";
import {updateVisaApplicationReview} from "./mutation-service";
import {type AdminStaffIdentity} from "@/features/admin/types";

function assertVisaReviewAccess(actor: AdminStaffIdentity) {
  if (!hasPermission(actor.role, PERMISSIONS.visaReview)) {
    throw new Error("Forbidden.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const templateCopy: Record<
  "approved" | "needs_changes" | "rejected" | "submitted_update",
  {headline: string; subjectPrefix: string}
> = {
  approved: {
    headline: "Your visa application has been approved.",
    subjectPrefix: "Visa application approved"
  },
  needs_changes: {
    headline: "We need a few updates before we can continue processing your visa application.",
    subjectPrefix: "Visa application needs updates"
  },
  rejected: {
    headline: "Your visa application review has been completed with an unsuccessful outcome.",
    subjectPrefix: "Visa application update"
  },
  submitted_update: {
    headline: "Your visa application has been reviewed and an update is available.",
    subjectPrefix: "Visa application update"
  }
};

export async function bulkReviewVisaApplications({
  actor,
  applicationIds,
  status
}: {
  actor: AdminStaffIdentity;
  applicationIds: string[];
  status: VisaApplicationStatus;
}) {
  assertVisaReviewAccess(actor);

  for (const applicationId of applicationIds) {
    await updateVisaApplicationReview({
      actor,
      applicationId,
      status
    });
  }

  await createAdminAuditLog({
    action: "visa_application.bulk_reviewed",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "visa_application",
    metadata: {
      applicationIds,
      status
    }
  });
}

export async function sendVisaTemplateResponse({
  actor,
  applicationId,
  customMessage,
  templateKey
}: {
  actor: AdminStaffIdentity;
  applicationId: string;
  customMessage: string | null;
  templateKey: "approved" | "needs_changes" | "rejected" | "submitted_update";
}) {
  assertVisaReviewAccess(actor);

  const admin = createSupabaseAdminClient();
  const [applicationResult, actorProfileResult] = await Promise.all([
    admin
      .from("visa_applications")
      .select("id, applicant_user_id, application_reference, visa_country_code")
      .eq("id", applicationId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .eq("user_id", actor.userId)
      .maybeSingle()
  ]);
  const application =
    (applicationResult.data as
      | {
          applicant_user_id: string;
          application_reference: string | null;
          id: string;
          visa_country_code: string;
        }
      | null) ?? null;

  if (!application) {
    throw new Error("Visa application not found.");
  }

  const applicantResult = await admin
    .from("profiles")
    .select("user_id, email, first_name, last_name")
    .eq("user_id", application.applicant_user_id)
    .maybeSingle();
  const applicant =
    (applicantResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;

  if (!applicant) {
    throw new Error("Visa applicant profile could not be found.");
  }

  const copy = templateCopy[templateKey];
  const applicantName =
    [applicant.first_name, applicant.last_name].filter(Boolean).join(" ") || applicant.email;
  const actorProfile =
    (actorProfileResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;
  const actorLabel =
    [actorProfile?.first_name, actorProfile?.last_name].filter(Boolean).join(" ") ||
    actor.email;
  const branding = await getSiteBranding();
  const escapedSiteName = escapeHtml(branding.siteName);
  const provider = createEmailProvider();
  const applicationReference = application.application_reference ?? application.id;

  await provider.send({
    html: `
      <div style="font-family:Manrope,Arial,sans-serif;background:#f7f3ec;padding:32px;color:#1c3d2e;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
          <div style="background:#1c3d2e;padding:24px 28px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${escapedSiteName} Visa Desk</p>
            <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:30px;color:#f5f0e8;">
              ${escapeHtml(copy.headline)}
            </h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              Hello ${escapeHtml(applicantName)},
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              Application reference: <strong>${escapeHtml(applicationReference)}</strong><br />
              Destination: <strong>${escapeHtml(application.visa_country_code)}</strong>
            </p>
            ${customMessage ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">${escapeHtml(customMessage).replaceAll("\n", "<br />")}</p>` : ""}
            <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#56705f;">
              Sent by ${escapeHtml(actorLabel)} from ${escapedSiteName}.
            </p>
          </div>
        </div>
      </div>
    `,
    subject: `${copy.subjectPrefix}: ${applicationReference}`,
    text: `Hello ${applicantName},\n\n${copy.headline}\nApplication reference: ${applicationReference}\nDestination: ${application.visa_country_code}${customMessage ? `\n\n${customMessage}` : ""}\n\nSent by ${actorLabel} from ${branding.siteName}.`,
    to: [applicant.email]
  });

  await createAdminAuditLog({
    action: "visa_application.template_response_sent",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: application.id,
    entityType: "visa_application",
    metadata: {
      templateKey
    },
    targetUserId: application.applicant_user_id
  });
}

export async function buildVisaApplicationDocumentsZip({
  actor,
  applicationId
}: {
  actor: AdminStaffIdentity;
  applicationId: string;
}) {
  assertVisaReviewAccess(actor);

  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select("id, application_reference, applicant_user_id")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  const application =
    (applicationResult.data as
      | {
          applicant_user_id: string;
          application_reference: string | null;
          id: string;
        }
      | null) ?? null;

  if (!application) {
    throw new Error("Visa application not found.");
  }

  const uploadsResult = await admin
    .from("uploads")
    .select("id, bucket_name, storage_path, file_name, metadata")
    .eq("owner_user_id", application.applicant_user_id)
    .eq("linked_entity_type", "visa_application")
    .eq("linked_entity_id", application.id)
    .is("deleted_at", null)
    .order("created_at", {ascending: true});
  const uploads =
    ((uploadsResult.data as Array<{
      bucket_name: string;
      file_name: string;
      id: string;
      metadata: Record<string, unknown>;
      storage_path: string;
    }> | null) ?? []);

  if (uploads.length === 0) {
    throw new Error("This application does not have any uploaded documents.");
  }

  const zip = new JSZip();

  for (const upload of uploads) {
    const downloadResult = await admin.storage.from(upload.bucket_name).download(upload.storage_path);

    if (downloadResult.error || !downloadResult.data) {
      throw new Error(downloadResult.error?.message ?? "Unable to download visa document.");
    }

    const arrayBuffer = await downloadResult.data.arrayBuffer();
    const documentType =
      typeof upload.metadata?.documentType === "string" ? upload.metadata.documentType : "document";
    zip.file(`${documentType}-${upload.file_name}`, Buffer.from(arrayBuffer));
  }

  const zipBytes = await zip.generateAsync({type: "uint8array"});
  const fileName = `aurevia-visa-${application.application_reference ?? application.id}.zip`;

  await createAdminAuditLog({
    action: "visa_application.documents_downloaded",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: application.id,
    entityType: "visa_application",
    targetUserId: application.applicant_user_id
  });

  return {
    fileName,
    zipBytes
  };
}
