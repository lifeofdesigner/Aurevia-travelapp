import "server-only";

import {createHash} from "crypto";

import {getServerEnv} from "@/lib/env/server";
import {type Json} from "@/types/supabase";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

function toJson(value: unknown) {
  return value as Json;
}

async function ensureInvoicesBucket() {
  const admin = createSupabaseAdminClient();
  const bucketName = getServerEnv().SUPABASE_INVOICES_BUCKET;
  const createResult = await admin.storage.createBucket(bucketName, {
    allowedMimeTypes: ["application/pdf"],
    fileSizeLimit: 10 * 1024 * 1024,
    public: false
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
    throw new Error(createResult.error.message);
  }

  return bucketName;
}

export async function storeInvoicePdf({
  bookingId,
  fileBytes,
  fileName,
  invoiceId,
  ownerUserId
}: {
  bookingId: string;
  fileBytes: Uint8Array;
  fileName: string;
  invoiceId: string;
  ownerUserId: string;
}) {
  const bucketName = await ensureInvoicesBucket();
  const admin = createSupabaseAdminClient();
  const storagePath = `${ownerUserId}/${bookingId}/${invoiceId}/${fileName}`;
  const checksumSha256 = createHash("sha256").update(fileBytes).digest("hex");
  const uploadResult = await admin.storage.from(bucketName).upload(storagePath, fileBytes, {
    contentType: "application/pdf",
    upsert: true
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const uploadInsert = await admin
    .from("uploads")
    .upsert(
      {
        bucket_name: bucketName,
        byte_size: fileBytes.byteLength,
        checksum_sha256: checksumSha256,
        document_category: "invoice_pdf",
        file_extension: "pdf",
        file_name: fileName,
        is_private: true,
        linked_entity_id: invoiceId,
        linked_entity_type: "invoice",
        metadata: toJson({
          bookingId
        }),
        mime_type: "application/pdf",
        owner_user_id: ownerUserId,
        storage_path: storagePath
      },
      {
        onConflict: "bucket_name,storage_path"
      }
    )
    .select("id")
    .single();

  if (uploadInsert.error || !uploadInsert.data?.id) {
    throw new Error(uploadInsert.error?.message ?? "Unable to save the invoice PDF metadata.");
  }

  return (uploadInsert.data as {id: string}).id;
}

export async function createInvoicePdfAccessUrl({
  invoiceId,
  userId
}: {
  invoiceId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const invoiceResult = await admin
    .from("invoices")
    .select("id, user_id, pdf_upload_id")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  const invoice =
    (invoiceResult.data as {id: string; pdf_upload_id: string | null; user_id: string} | null) ??
    null;

  if (!invoice?.pdf_upload_id) {
    throw new Error("The invoice PDF is not available.");
  }

  const uploadResult = await admin
    .from("uploads")
    .select("bucket_name, storage_path")
    .eq("id", invoice.pdf_upload_id)
    .eq("owner_user_id", userId)
    .maybeSingle();
  const upload =
    (uploadResult.data as {bucket_name: string; storage_path: string} | null) ?? null;

  if (!upload) {
    throw new Error("The invoice PDF could not be found.");
  }

  const signedUrlResult = await admin.storage
    .from(upload.bucket_name)
    .createSignedUrl(upload.storage_path, 120);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    throw new Error(signedUrlResult.error?.message ?? "Unable to prepare invoice access.");
  }

  return signedUrlResult.data.signedUrl;
}
