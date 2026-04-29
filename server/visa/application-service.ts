import "server-only";

import {type Json} from "@/types/supabase";
import {generateBookingReference} from "@/lib/booking-reference";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {
  getVisaCountryOption,
  getVisaServiceProduct
} from "@/features/visa/lib/catalog";
import {parseVisaDraftValues} from "@/features/visa/lib/schemas";
import {getVisaDisplayStatus, isVisaApplicationEditable} from "@/features/visa/lib/status";
import {
  type VisaApplicationDraftValues,
  type VisaApplicationFormValues,
  type VisaProductType,
  type VisaApplicationRequirementSnapshot,
  type VisaApplicationSaveResult,
  type VisaApplicationStatus,
  type VisaApplicationSubmitResult
} from "@/features/visa/types";

type VisaApplicationRow = {
  applicant_user_id: string;
  application_reference: string | null;
  form_data: Json;
  id: string;
  reviewed_at: string | null;
  status: VisaApplicationStatus;
  submitted_at: string | null;
  updated_at: string;
  visa_country_code: string;
};

type CreateVisaDraftInput = {
  nationalityCountryCode?: string;
  travelDate?: string;
  userId: string;
  visaCountryCode: string;
  visaType?: VisaProductType;
};

type SaveVisaDraftInput = {
  applicationId: string;
  formData: VisaApplicationDraftValues;
  userId: string;
};

type SubmitVisaApplicationInput = {
  applicationId: string;
  formData: VisaApplicationFormValues;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

function mergeDraftValues(
  existingValues: VisaApplicationDraftValues,
  nextValues: VisaApplicationDraftValues
) {
  return {
    ...existingValues,
    ...nextValues,
    companions: nextValues.companions ?? existingValues.companions ?? []
  };
}

async function getOwnedApplication(applicationId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select(
      "id, applicant_user_id, visa_country_code, status, form_data, application_reference, submitted_at, reviewed_at, updated_at"
    )
    .eq("id", applicationId)
    .eq("applicant_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  return (applicationResult.data as VisaApplicationRow | null) ?? null;
}

async function getApplicationUploads(applicationId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const uploadsResult = await admin
    .from("uploads")
    .select("id, file_name, document_category, metadata, created_at")
    .eq("owner_user_id", userId)
    .eq("linked_entity_type", "visa_application")
    .eq("linked_entity_id", applicationId)
    .is("deleted_at", null)
    .order("created_at", {ascending: true});

  return (
    (uploadsResult.data as Array<{
      created_at: string;
      document_category: string;
      file_name: string;
      id: string;
      metadata: Json;
    }> | null) ?? []
  );
}

function buildRequirementsSnapshot(
  visaCountryCode: string,
  uploads: Array<{
    file_name: string;
    id: string;
    metadata: Json;
  }>
) {
  const product = getVisaServiceProduct(visaCountryCode);

  if (!product) {
    throw new Error("The selected visa service is unavailable.");
  }

  const uploadCountByCode = new Map<string, number>();

  for (const upload of uploads) {
    const documentType =
      typeof upload.metadata === "object" &&
      upload.metadata !== null &&
      "documentType" in upload.metadata &&
      typeof upload.metadata.documentType === "string"
        ? upload.metadata.documentType
        : null;

    if (!documentType) {
      continue;
    }

    uploadCountByCode.set(documentType, (uploadCountByCode.get(documentType) ?? 0) + 1);
  }

  const required: VisaApplicationRequirementSnapshot[] = product.requirementCodes.map((code) => ({
    code,
    required: true,
    uploadCount: uploadCountByCode.get(code) ?? 0
  }));
  const optional: VisaApplicationRequirementSnapshot[] = product.optionalRequirementCodes.map(
    (code) => ({
      code,
      required: false,
      uploadCount: uploadCountByCode.get(code) ?? 0
    })
  );

  return {
    pricing: product.price,
    processingTimeline: product.processingTimeline,
    requirements: [...required, ...optional],
    serviceCode: product.serviceCode,
    supportsDependents: product.supportsDependents
  };
}

function getIntendedTravelDate(values: VisaApplicationDraftValues) {
  return values.intendedArrivalDate && values.intendedArrivalDate.length > 0
    ? values.intendedArrivalDate
    : null;
}

export async function createVisaApplicationDraft({
  nationalityCountryCode,
  travelDate,
  userId,
  visaCountryCode,
  visaType
}: CreateVisaDraftInput) {
  const admin = createSupabaseAdminClient();
  const country = getVisaCountryOption(visaCountryCode);
  const product = getVisaServiceProduct(visaCountryCode);

  if (!country || !product) {
    throw new Error("The selected visa service is unavailable.");
  }

  const initialFormData: VisaApplicationDraftValues = {
    destinationCountryCode: product.countryCode,
    intendedArrivalDate: travelDate,
    nationalityCountryCode,
    passportCountryCode: nationalityCountryCode,
    residencyCountryCode: nationalityCountryCode,
    visaType: visaType ?? "tourist"
  };

  const insertResult = await admin
    .from("visa_applications")
    .insert({
      applicant_country_code: nationalityCountryCode ?? null,
      applicant_user_id: userId,
      form_data: toJson(initialFormData),
      intended_travel_date: getIntendedTravelDate(initialFormData),
      requirements_snapshot: toJson(buildRequirementsSnapshot(country.code, [])),
      status: "draft",
      visa_country_code: country.code
    })
    .select("id")
    .single();

  const application = (insertResult.data as {id: string} | null) ?? null;

  if (!application) {
    throw new Error("Unable to create the visa application draft.");
  }

  return application.id;
}

export async function saveVisaApplicationDraft({
  applicationId,
  formData,
  userId
}: SaveVisaDraftInput): Promise<VisaApplicationSaveResult> {
  const application = await getOwnedApplication(applicationId, userId);

  if (!application) {
    throw new Error("The visa application could not be found.");
  }

  if (!isVisaApplicationEditable(application.status)) {
    throw new Error("This visa application can no longer be edited.");
  }

  const currentFormData = parseVisaDraftValues(application.form_data);
  const nextFormData = mergeDraftValues(currentFormData, parseVisaDraftValues(formData));
  const uploads = await getApplicationUploads(applicationId, userId);
  const admin = createSupabaseAdminClient();
  const persistedStatus =
    application.status === "draft" ? "draft" : getVisaDisplayStatus(application.status);
  const updateResult = await admin
    .from("visa_applications")
    .update({
      applicant_country_code: nextFormData.nationalityCountryCode ?? null,
      form_data: toJson(nextFormData),
      intended_travel_date: getIntendedTravelDate(nextFormData),
      requirements_snapshot: toJson(
        buildRequirementsSnapshot(application.visa_country_code, uploads)
      ),
      status: persistedStatus
    })
    .eq("id", application.id)
    .select("id, status, updated_at")
    .single();
  const updated =
    (updateResult.data as {id: string; status: VisaApplicationStatus; updated_at: string} | null) ??
    null;

  if (!updated) {
    throw new Error("Unable to save the visa application draft.");
  }

  return {
    applicationId: updated.id,
    savedAt: updated.updated_at,
    status: updated.status
  };
}

export async function submitVisaApplication({
  applicationId,
  formData,
  userId
}: SubmitVisaApplicationInput): Promise<VisaApplicationSubmitResult> {
  const application = await getOwnedApplication(applicationId, userId);

  if (!application) {
    throw new Error("The visa application could not be found.");
  }

  if (!isVisaApplicationEditable(application.status)) {
    throw new Error("This visa application can no longer be submitted.");
  }

  const product = getVisaServiceProduct(application.visa_country_code);
  const currentFormData = parseVisaDraftValues(application.form_data);

  if (!product) {
    throw new Error("The selected visa service is unavailable.");
  }

  const uploads = await getApplicationUploads(applicationId, userId);
  const uploadedDocumentTypes = new Set(
    uploads
      .map((upload) =>
        typeof upload.metadata === "object" &&
        upload.metadata !== null &&
        "documentType" in upload.metadata &&
        typeof upload.metadata.documentType === "string"
          ? upload.metadata.documentType
          : null
      )
      .filter((documentType): documentType is string => Boolean(documentType))
  );

  const missingRequiredDocument = product.requirementCodes.find(
    (code) => !uploadedDocumentTypes.has(code)
  );

  if (missingRequiredDocument) {
    throw new Error("Please upload all required visa documents before submission.");
  }

  const admin = createSupabaseAdminClient();
  const reference = application.application_reference ?? generateBookingReference("VISA");
  const now = new Date().toISOString();
  const nextFormData = {
    ...currentFormData,
    ...formData
  };
  const updateResult = await admin
    .from("visa_applications")
    .update({
      applicant_country_code: nextFormData.nationalityCountryCode,
      application_reference: reference,
      form_data: toJson(nextFormData),
      intended_travel_date: nextFormData.intendedArrivalDate,
      requirements_snapshot: toJson(
        buildRequirementsSnapshot(application.visa_country_code, uploads)
      ),
      status: "submitted",
      submitted_at: application.submitted_at ?? now
    })
    .eq("id", application.id)
    .select("id, application_reference, updated_at")
    .single();
  const updated =
    (updateResult.data as
      | {application_reference: string; id: string; updated_at: string}
      | null) ?? null;

  if (!updated) {
    throw new Error("Unable to submit the visa application.");
  }

  return {
    applicationId: updated.id,
    applicationReference: updated.application_reference,
    savedAt: updated.updated_at,
    status: "submitted"
  };
}
