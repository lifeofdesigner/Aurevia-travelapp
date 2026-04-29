import "server-only";

import {createHash} from "crypto";

import {getServerEnv} from "@/lib/env/server";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {
  getVisaServiceProduct,
  VISA_REQUIREMENT_DEFINITIONS
} from "@/features/visa/lib/catalog";
import {isVisaApplicationEditable} from "@/features/visa/lib/status";
import {type VisaDocumentType, type VisaUploadedDocument} from "@/features/visa/types";
import {type VisaApplicationStatus} from "@/types/database-enums";
import {type Json} from "@/types/supabase";

type VisaUploadApplicationRow = {
  applicant_user_id: string;
  id: string;
  status: VisaApplicationStatus;
  visa_country_code: string;
};

const MAX_UPLOAD_FILE_NAME_LENGTH = 160;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

function toJson(value: unknown) {
  return value as Json;
}

async function ensureVisaDocumentsBucket() {
  const admin = createSupabaseAdminClient();
  const bucketName = getServerEnv().SUPABASE_VISA_DOCUMENTS_BUCKET;
  const createResult = await admin.storage.createBucket(bucketName, {
    allowedMimeTypes: Array.from(
      new Set(
        Object.values(VISA_REQUIREMENT_DEFINITIONS).flatMap(
          (definition) => definition.acceptedMimeTypes
        )
      )
    ),
    fileSizeLimit: 10 * 1024 * 1024,
    public: false
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
    throw new Error(createResult.error.message);
  }

  return bucketName;
}

async function getOwnedEditableApplication(applicationId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select("id, applicant_user_id, status, visa_country_code")
    .eq("id", applicationId)
    .eq("applicant_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const application = (applicationResult.data as VisaUploadApplicationRow | null) ?? null;

  if (!application) {
    throw new Error("The visa application could not be found.");
  }

  if (!isVisaApplicationEditable(application.status)) {
    throw new Error("This visa application can no longer accept document changes.");
  }

  return application;
}

export async function uploadVisaDocument({
  applicationId,
  documentType,
  file,
  userId
}: {
  applicationId: string;
  documentType: VisaDocumentType;
  file: File;
  userId: string;
}): Promise<VisaUploadedDocument> {
  const definition = VISA_REQUIREMENT_DEFINITIONS[documentType];

  if (!definition) {
    throw new Error("Unsupported visa document type.");
  }

  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.name.trim().length === 0 || file.name.length > MAX_UPLOAD_FILE_NAME_LENGTH) {
    throw new Error("The selected file name is invalid.");
  }

  if (!definition.acceptedMimeTypes.includes(file.type)) {
    throw new Error("This document type is not allowed for the selected upload slot.");
  }

  if (file.size > definition.maxSizeBytes) {
    throw new Error("The selected file exceeds the permitted size.");
  }

  const application = await getOwnedEditableApplication(applicationId, userId);
  const product = getVisaServiceProduct(application.visa_country_code);

  if (!product) {
    throw new Error("The selected visa service is unavailable.");
  }

  const allowedDocumentTypes = new Set([
    ...product.requirementCodes,
    ...product.optionalRequirementCodes
  ]);

  if (!allowedDocumentTypes.has(documentType)) {
    throw new Error("This upload is not part of the selected visa service requirements.");
  }

  const bucketName = await ensureVisaDocumentsBucket();
  const admin = createSupabaseAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const fileName = sanitizeFileName(file.name);
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? null : null;
  const storagePath = [
    userId,
    applicationId,
    documentType,
    `${Date.now()}-${fileName}`
  ].join("/");
  const uploadResult = await admin.storage.from(bucketName).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const insertResult = await admin
    .from("uploads")
    .insert({
      bucket_name: bucketName,
      byte_size: file.size,
      checksum_sha256: checksumSha256,
      document_category: definition.documentCategory,
      file_extension: extension,
      file_name: file.name,
      is_private: true,
      linked_entity_id: applicationId,
      linked_entity_type: "visa_application",
      metadata: toJson({
        documentType
      }),
      mime_type: file.type,
      owner_user_id: userId,
      storage_path: storagePath
    })
    .select("id, file_name, mime_type, byte_size, document_category, metadata, created_at, linked_entity_id")
    .single();
  const upload =
    (insertResult.data as
      | {
          byte_size: number;
          created_at: string;
          document_category: "passport_scan" | "visa_document";
          file_name: string;
          id: string;
          linked_entity_id: string;
          metadata: Json;
          mime_type: string;
        }
      | null) ?? null;

  if (!upload) {
    throw new Error("The document metadata could not be saved.");
  }

  return {
    accessPath: `/api/visa/uploads/${upload.id}/access`,
    applicationId: upload.linked_entity_id,
    byteSize: upload.byte_size,
    createdAt: upload.created_at,
    documentCategory: upload.document_category,
    documentType,
    fileName: upload.file_name,
    id: upload.id,
    mimeType: upload.mime_type
  };
}

export async function createVisaUploadAccessUrl({
  uploadId,
  userId
}: {
  uploadId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const uploadResult = await admin
    .from("uploads")
    .select("id, owner_user_id, bucket_name, storage_path")
    .eq("id", uploadId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const upload =
    (uploadResult.data as
      | {bucket_name: string; id: string; owner_user_id: string; storage_path: string}
      | null) ?? null;

  if (!upload) {
    throw new Error("The document could not be found.");
  }

  const signedUrlResult = await admin.storage
    .from(upload.bucket_name)
    .createSignedUrl(upload.storage_path, 60);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    throw new Error(signedUrlResult.error?.message ?? "Unable to prepare secure document access.");
  }

  return signedUrlResult.data.signedUrl;
}
