import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatStartConversationSchema} from "@/features/live-chat/lib/schemas";
import {
  errorResponse,
  getClientIp,
  getLiveChatToken,
  getOptionalUserId,
  getUserAgent
} from "@/server/live-chat/http";
import {startLiveChatConversation} from "@/server/live-chat/service";

export async function POST(request: Request) {
  try {
    const input = liveChatStartConversationSchema.parse(await request.json());
    const userId = await getOptionalUserId();
    const conversation = await startLiveChatConversation({
      ...input,
      ip: getClientIp(request),
      token: getLiveChatToken(request),
      userAgent: getUserAgent(request),
      userId
    });

    return NextResponse.json(conversation, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid chat request."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to start chat.");
  }
}
