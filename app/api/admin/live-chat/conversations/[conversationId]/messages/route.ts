import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAgentMessageSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {sendAgentLiveChatMessage} from "@/server/live-chat/service";

export async function POST(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatAgentMessageSchema.parse(await request.json());

    await sendAgentLiveChatMessage({
      actor,
      attachments: input.attachments,
      body: input.body,
      conversationId: params.conversationId,
      isInternalNote: input.isInternalNote
    });

    return NextResponse.json({ok: true}, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid live chat reply."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to send live chat reply.");
  }
}
