import {NextResponse} from "next/server";

import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {createLiveChatAttachmentAccessUrl} from "@/server/live-chat/service";

export async function GET(
  request: Request,
  {params}: {params: {uploadId: string}}
) {
  try {
    const userId = await getOptionalUserId();
    const url = await createLiveChatAttachmentAccessUrl({
      token: getLiveChatToken(request),
      uploadId: params.uploadId,
      userId
    });

    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error, "Unable to access attachment.");
  }
}
