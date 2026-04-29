import {NextResponse} from "next/server";

import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {getVisitorLiveChatConversation} from "@/server/live-chat/service";

export async function GET(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const userId = await getOptionalUserId();
    const conversation = await getVisitorLiveChatConversation({
      conversationId: params.conversationId,
      token: getLiveChatToken(request),
      userId
    });

    return NextResponse.json(conversation);
  } catch (error) {
    return errorResponse(error, "Unable to load conversation.");
  }
}
