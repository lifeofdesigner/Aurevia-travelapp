import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAutomationRuleSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {saveLiveChatAutomationRule} from "@/server/live-chat/service";

export async function PATCH(
  request: Request,
  {params}: {params: {ruleId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatAutomationRuleSchema.parse(await request.json());

    await saveLiveChatAutomationRule({
      actor,
      input,
      ruleId: params.ruleId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid automation rule."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update automation rule.");
  }
}
