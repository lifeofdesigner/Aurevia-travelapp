import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {uploadHomepageImage} from "@/server/homepage/admin-service";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("homepage.manage");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({message: "An image file is required."}, {status: 400});
    }

    const result = await uploadHomepageImage({
      actor,
      file
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload image.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
