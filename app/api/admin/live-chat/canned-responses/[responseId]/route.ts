import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatCannedResponseSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {saveLiveChatCannedResponse} from "@/server/live-chat/service";

export async function PATCH(
  request: Request,
  {params}: {params: {responseId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatCannedResponseSchema.parse(await request.json());

    await saveLiveChatCannedResponse({
      actor,
      cannedResponseId: params.responseId,
      input
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid canned response."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update canned response.");
  }
}
