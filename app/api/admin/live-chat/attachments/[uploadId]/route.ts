import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {createLiveChatAttachmentAccessUrl} from "@/server/live-chat/service";

export async function GET(
  _request: Request,
  {params}: {params: {uploadId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.view");
    const url = await createLiveChatAttachmentAccessUrl({
      actor,
      uploadId: params.uploadId
    });

    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error, "Unable to access attachment.");
  }
}
