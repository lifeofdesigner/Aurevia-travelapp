import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {getVisitorLiveChatTranscript} from "@/server/live-chat/service";

export async function GET(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const userId = await getOptionalUserId();
    const transcript = await getVisitorLiveChatTranscript({
      conversationId: params.conversationId,
      token: getLiveChatToken(request),
      userId
    });

    return new Response(transcript, {
      headers: {
        "Content-Disposition": `attachment; filename="live-chat-${params.conversationId}.txt"`,
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error) {
    return errorResponse(error, "Unable to export transcript.");
  }
}
