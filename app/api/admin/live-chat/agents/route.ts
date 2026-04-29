import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAgentSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {saveLiveChatAgent} from "@/server/live-chat/service";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatAgentSchema.parse(await request.json());

    await saveLiveChatAgent({actor, input});

    return NextResponse.json({ok: true}, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid live chat agent."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to save live chat agent.");
  }
}
