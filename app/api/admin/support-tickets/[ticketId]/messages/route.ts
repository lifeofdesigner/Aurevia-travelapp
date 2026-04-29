import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminSupportReplyInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {createAdminSupportReply} from "@/server/admin/support-manager-service";

export async function POST(
  request: Request,
  {params}: {params: {ticketId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = parseAdminSupportReplyInput(await request.json());

    await createAdminSupportReply({
      actor,
      messageBody: input.messageBody,
      replyTo: input.replyTo,
      ticketId: params.ticketId
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/support`);
      revalidatePath(`/${locale}/admin/support/${params.ticketId}`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid support reply."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to send the support reply.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
