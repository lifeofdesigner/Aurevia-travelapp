import "server-only";

import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {parseVisaDraftValues} from "@/features/visa/lib/schemas";
import {isVisaApplicationEditable} from "@/features/visa/lib/status";
import {
  type VisaApplicationDraftValues,
  type VisaProductType,
  type VisaApplicationStatus,
  type VisaUploadedDocument,
  VISA_DOCUMENT_TYPES
} from "@/features/visa/types";
import {type Json} from "@/types/supabase";

export type VisaApplicationRecord = {
  applicationReference: string | null;
  countryCode: string;
  createdAt: string;
  formData: VisaApplicationDraftValues;
  id: string;
  reviewedAt: string | null;
  status: VisaApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  visaType: VisaProductType;
};

export type VisaApplicationListRecord = {
  applicationReference: string | null;
  countryCode: string;
  createdAt: string;
  id: string;
  status: VisaApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  uploadCount: number;
  visaType: VisaProductType;
};

type VisaApplicationRow = {
  application_reference: string | null;
  created_at: string;
  form_data: Json;
  id: string;
  reviewed_at: string | null;
  status: VisaApplicationStatus;
  submitted_at: string | null;
  updated_at: string;
  visa_country_code: string;
};

type VisaUploadRow = {
  byte_size: number;
  created_at: string;
  document_category: "passport_scan" | "visa_document";
  file_name: string;
  id: string;
  linked_entity_id: string | null;
  metadata: Json;
  mime_type: string;
};

type VisaUploadCountRow = {
  linked_entity_id: string | null;
};

function mapVisaApplicationRow(application: VisaApplicationRow): VisaApplicationRecord {
  const formData = parseVisaDraftValues(application.form_data);

  return {
    applicationReference: application.application_reference,
    countryCode: application.visa_country_code,
    createdAt: application.created_at,
    formData,
    id: application.id,
    reviewedAt: application.reviewed_at,
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    visaType: formData.visaType ?? "tourist"
  } satisfies VisaApplicationRecord;
}

export async function getVisaApplicationForUser(applicationId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select(
      "id, visa_country_code, status, application_reference, form_data, submitted_at, reviewed_at, created_at, updated_at"
    )
    .eq("id", applicationId)
    .eq("applicant_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const application = (applicationResult.data as VisaApplicationRow | null) ?? null;

  if (!application) {
    return null;
  }

  return mapVisaApplicationRow(application);
}

export async function getVisaUploadsForUser(applicationId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const uploadsResult = await admin
    .from("uploads")
    .select(
      "id, file_name, mime_type, byte_size, document_category, metadata, created_at, linked_entity_id"
    )
    .eq("owner_user_id", userId)
    .eq("linked_entity_type", "visa_application")
    .eq("linked_entity_id", applicationId)
    .is("deleted_at", null)
    .order("created_at", {ascending: true});
  const uploads = (uploadsResult.data as VisaUploadRow[] | null) ?? [];

  return uploads.map((upload) => {
    const rawDocumentType =
      typeof upload.metadata === "object" &&
      upload.metadata !== null &&
      "documentType" in upload.metadata &&
      typeof upload.metadata.documentType === "string"
        ? upload.metadata.documentType
        : null;
    const documentType: (typeof VISA_DOCUMENT_TYPES)[number] = VISA_DOCUMENT_TYPES.includes(
      rawDocumentType as (typeof VISA_DOCUMENT_TYPES)[number]
    )
      ? (rawDocumentType as (typeof VISA_DOCUMENT_TYPES)[number])
      : "travel_itinerary";

    return {
      accessPath: `/api/visa/uploads/${upload.id}/access`,
      applicationId: upload.linked_entity_id ?? applicationId,
      byteSize: upload.byte_size,
      createdAt: upload.created_at,
      documentCategory: upload.document_category,
      documentType,
      fileName: upload.file_name,
      id: upload.id,
      mimeType: upload.mime_type
    } satisfies VisaUploadedDocument;
  });
}

export async function listVisaApplicationsForUser(
  userId: string
): Promise<VisaApplicationListRecord[]> {
  const admin = createSupabaseAdminClient();
  const [applicationsResult, uploadsResult] = await Promise.all([
    admin
      .from("visa_applications")
      .select(
        "id, visa_country_code, status, application_reference, form_data, submitted_at, reviewed_at, created_at, updated_at"
      )
      .eq("applicant_user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", {ascending: false}),
    admin
      .from("uploads")
      .select("linked_entity_id")
      .eq("owner_user_id", userId)
      .eq("linked_entity_type", "visa_application")
      .is("deleted_at", null)
  ]);
  const applications = (applicationsResult.data as VisaApplicationRow[] | null) ?? [];
  const uploads = (uploadsResult.data as VisaUploadCountRow[] | null) ?? [];
  const uploadCountByApplicationId = new Map<string, number>();

  for (const upload of uploads) {
    if (!upload.linked_entity_id) {
      continue;
    }

    uploadCountByApplicationId.set(
      upload.linked_entity_id,
      (uploadCountByApplicationId.get(upload.linked_entity_id) ?? 0) + 1
    );
  }

  return applications.map((application) => ({
    applicationReference: application.application_reference,
    countryCode: application.visa_country_code,
    createdAt: application.created_at,
    id: application.id,
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    uploadCount: uploadCountByApplicationId.get(application.id) ?? 0,
    visaType: parseVisaDraftValues(application.form_data).visaType ?? "tourist"
  }));
}

export async function getLatestEditableVisaApplicationForUser(
  userId: string,
  countryCode: string,
  visaType?: VisaProductType
) {
  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select(
      "id, visa_country_code, status, application_reference, form_data, submitted_at, reviewed_at, created_at, updated_at"
    )
    .eq("applicant_user_id", userId)
    .eq("visa_country_code", countryCode.toUpperCase())
    .is("deleted_at", null)
    .order("updated_at", {ascending: false})
    .limit(10);
  const applications = (applicationResult.data as VisaApplicationRow[] | null) ?? [];
  const editableApplication = applications.find((application) => {
    if (!isVisaApplicationEditable(application.status)) {
      return false;
    }

    if (!visaType) {
      return true;
    }

    return (parseVisaDraftValues(application.form_data).visaType ?? "tourist") === visaType;
  });

  if (!editableApplication) {
    return null;
  }

  return mapVisaApplicationRow(editableApplication);
}
