import "server-only";

import {createHash} from "crypto";

import {createAdminAuditLog} from "@/server/admin/audit";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type AdminStaffIdentity} from "@/features/admin/types";
import {type Json} from "@/types/supabase";

const BRAND_ASSET_BUCKET = "homepage-assets";
const BRAND_ASSET_MAX_BYTES = 2 * 1024 * 1024;
const BRAND_ASSET_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function asJson(value: unknown) {
  return value as Json;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

async function ensureBrandAssetsBucket() {
  const admin = createSupabaseAdminClient();
  const createResult = await admin.storage.createBucket(BRAND_ASSET_BUCKET, {
    allowedMimeTypes: [...BRAND_ASSET_MIME_TYPES],
    fileSizeLimit: BRAND_ASSET_MAX_BYTES,
    public: true
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
    throw new Error(createResult.error.message);
  }
}

export async function uploadBrandAsset({
  actor,
  assetType,
  file
}: {
  actor: AdminStaffIdentity;
  assetType: "favicon" | "logo";
  file: File;
}) {
  if (!BRAND_ASSET_MIME_TYPES.includes(file.type as (typeof BRAND_ASSET_MIME_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed for brand assets.");
  }

  if (file.size > BRAND_ASSET_MAX_BYTES) {
    throw new Error("Brand assets must be 2MB or smaller.");
  }

  await ensureBrandAssetsBucket();

  const admin = createSupabaseAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const safeFileName = sanitizeFileName(file.name);
  const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() ?? null : null;
  const storagePath = ["brand", assetType, actor.userId, `${Date.now()}-${safeFileName}`].join("/");
  const uploadResult = await admin.storage.from(BRAND_ASSET_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const publicUrlResult = admin.storage.from(BRAND_ASSET_BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicUrlResult.data.publicUrl;

  await admin.from("uploads").insert({
    bucket_name: BRAND_ASSET_BUCKET,
    byte_size: file.size,
    checksum_sha256: checksumSha256,
    document_category: "other",
    file_extension: extension,
    file_name: file.name,
    is_private: false,
    linked_entity_type: "brand_asset",
    metadata: asJson({
      assetType,
      uploadedByRole: actor.role
    }),
    mime_type: file.type,
    owner_user_id: actor.userId,
    storage_path: storagePath
  });

  await createAdminAuditLog({
    action: `admin.brand_asset.${assetType}.uploaded`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "brand_asset",
    metadata: {
      assetType,
      fileName: file.name,
      storagePath
    }
  });

  return {
    url: publicUrl
  };
}
