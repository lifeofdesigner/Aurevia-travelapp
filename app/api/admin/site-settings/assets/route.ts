import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {uploadBrandAsset} from "@/server/admin/brand-asset-service";

const assetTypeSchema = z.enum(["favicon", "logo"]);

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("settings.manage");
    const formData = await request.formData();
    const assetType = assetTypeSchema.parse(formData.get("assetType"));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({message: "A brand image file is required."}, {status: 400});
    }

    const result = await uploadBrandAsset({
      actor,
      assetType,
      file
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/admin/settings`);
    }
    revalidatePath("/admin-login");
    revalidatePath("/admin-login/forgot-password");
    revalidatePath("/setup");

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload brand asset.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;

    return NextResponse.json({message}, {status});
  }
}
