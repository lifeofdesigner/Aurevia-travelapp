import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminBookingEmailInput} from "@/features/admin/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {sendAdminCustomerEmail} from "@/server/admin/customers-manager-service";

export async function POST(
  request: Request,
  {params}: {params: {userId: string}}
) {
  try {
    const actor = await requireAdminApiUser("customers.edit");
    const input = parseAdminBookingEmailInput(await request.json());

    await sendAdminCustomerEmail({
      actor,
      message: input.message,
      replyTo: input.replyTo,
      subject: input.subject,
      userId: params.userId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid customer email."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to send the customer email.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
