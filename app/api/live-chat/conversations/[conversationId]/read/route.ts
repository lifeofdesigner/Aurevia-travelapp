import {NextResponse} from "next/server";

import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {markVisitorConversationRead} from "@/server/live-chat/service";

export async function POST(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const userId = await getOptionalUserId();
    await markVisitorConversationRead({
      conversationId: params.conversationId,
      token: getLiveChatToken(request),
      userId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return errorResponse(error, "Unable to update read state.");
  }
}
