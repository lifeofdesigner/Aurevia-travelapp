import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAgentSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {saveLiveChatAgent} from "@/server/live-chat/service";

export async function PATCH(
  request: Request,
  {params}: {params: {agentId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatAgentSchema.parse(await request.json());

    await saveLiveChatAgent({
      actor,
      agentId: params.agentId,
      input
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid live chat agent."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update live chat agent.");
  }
}
