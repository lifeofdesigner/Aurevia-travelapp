import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatVisitorMessageSchema} from "@/features/live-chat/lib/schemas";
import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {sendVisitorLiveChatMessage} from "@/server/live-chat/service";

export async function POST(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const input = liveChatVisitorMessageSchema.parse(await request.json());
    const userId = await getOptionalUserId();
    const conversation = await sendVisitorLiveChatMessage({
      attachments: input.attachments,
      body: input.body,
      conversationId: params.conversationId,
      currentPageUrl: input.currentPageUrl,
      token: getLiveChatToken(request),
      userId
    });

    return NextResponse.json(conversation, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid chat message."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to send message.");
  }
}
