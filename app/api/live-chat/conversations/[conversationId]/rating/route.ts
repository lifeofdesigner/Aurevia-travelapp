import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatRatingSchema} from "@/features/live-chat/lib/schemas";
import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {submitLiveChatRating} from "@/server/live-chat/service";

export async function POST(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const input = liveChatRatingSchema.parse(await request.json());
    const userId = await getOptionalUserId();

    await submitLiveChatRating({
      conversationId: params.conversationId,
      feedback: input.feedback,
      rating: input.rating,
      token: getLiveChatToken(request),
      userId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid rating."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to submit rating.");
  }
}
