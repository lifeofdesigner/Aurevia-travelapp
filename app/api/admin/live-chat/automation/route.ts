import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatAutomationRuleSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {
  listLiveChatAutomationRules,
  saveLiveChatAutomationRule
} from "@/server/live-chat/service";

export async function GET() {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const rules = await listLiveChatAutomationRules(actor);

    return NextResponse.json({rules});
  } catch (error) {
    return errorResponse(error, "Unable to load automation rules.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatAutomationRuleSchema.parse(await request.json());

    await saveLiveChatAutomationRule({actor, input});

    return NextResponse.json({ok: true}, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid automation rule."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to save automation rule.");
  }
}
