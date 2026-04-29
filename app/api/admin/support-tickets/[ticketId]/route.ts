import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminSupportTicketInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateSupportTicketByAdmin} from "@/server/admin/mutation-service";

export async function PATCH(
  request: Request,
  {params}: {params: {ticketId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = parseAdminSupportTicketInput(await request.json());

    await updateSupportTicketByAdmin({
      actor,
      assignedAdminUserId: input.assignedAdminUserId,
      priority: input.priority,
      status: input.status,
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
        {message: error.issues[0]?.message ?? "Invalid support ticket update."},
        {status: 400}
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to update the support ticket.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
