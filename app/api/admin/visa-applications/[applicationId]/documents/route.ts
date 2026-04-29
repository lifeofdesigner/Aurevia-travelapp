import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {buildVisaApplicationDocumentsZip} from "@/server/admin/visa-review-service";

export async function GET(
  _request: Request,
  {params}: {params: {applicationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("visa.review");
    const result = await buildVisaApplicationDocumentsZip({
      actor,
      applicationId: params.applicationId
    });

    return new NextResponse(Buffer.from(result.zipBytes), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Type": "application/zip"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download the application documents.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
