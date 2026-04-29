import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {requestLiveChatRating} from "@/server/live-chat/service";

export async function POST(
  _request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    await requestLiveChatRating({
      actor,
      conversationId: params.conversationId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return errorResponse(error, "Unable to request a rating.");
  }
}
