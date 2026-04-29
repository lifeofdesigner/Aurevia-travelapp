import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {requireAdminApiUser} from "@/server/admin/auth";
import {EMAIL_TEMPLATE_KEYS, sendAdminTestEmail} from "@/server/email/send-email";

const requestSchema = z.object({
  template: z.enum(EMAIL_TEMPLATE_KEYS)
});

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("settings.manage");
    const input = requestSchema.parse(await request.json());

    await sendAdminTestEmail({
      template: input.template,
      to: actor.email
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid email test request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to send the test email.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
