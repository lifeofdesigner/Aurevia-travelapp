import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminBookingEmailInput} from "@/features/admin/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {sendAdminBookingEmail} from "@/server/admin/bookings-manager-service";

export async function POST(
  request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    const actor = await requireAdminApiUser("bookings.edit");
    const input = parseAdminBookingEmailInput(await request.json());

    await sendAdminBookingEmail({
      actor,
      bookingId: params.bookingId,
      message: input.message,
      replyTo: input.replyTo,
      subject: input.subject
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid booking email."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to send the booking email.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
