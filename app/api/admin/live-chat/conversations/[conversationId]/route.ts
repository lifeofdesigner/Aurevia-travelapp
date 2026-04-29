import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatConversationUpdateSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {
  getAdminLiveChatConversationDetail,
  updateLiveChatConversation
} from "@/server/live-chat/service";

export async function GET(
  _request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.view");
    const conversation = await getAdminLiveChatConversationDetail({
      actor,
      conversationId: params.conversationId
    });

    return NextResponse.json(conversation);
  } catch (error) {
    return errorResponse(error, "Unable to load live chat conversation.");
  }
}

export async function PATCH(
  request: Request,
  {params}: {params: {conversationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatConversationUpdateSchema.parse(await request.json());

    await updateLiveChatConversation({
      actor,
      assignedAgentId: input.assignedAgentId,
      conversationId: params.conversationId,
      departmentId: input.departmentId,
      priority: input.priority,
      status: input.status,
      tags: input.tags
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid conversation update."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update live chat conversation.");
  }
}
