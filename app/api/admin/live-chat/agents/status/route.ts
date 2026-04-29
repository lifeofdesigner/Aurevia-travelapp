import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAgentStatusSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {updateLiveChatAgentStatus} from "@/server/live-chat/service";

export async function PATCH(request: Request) {
  try {
    const actor = await requireAdminApiUser("support.view");
    const input = liveChatAgentStatusSchema.parse(await request.json());

    await updateLiveChatAgentStatus({
      actor,
      status: input.status
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid agent status."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update agent status.");
  }
}
