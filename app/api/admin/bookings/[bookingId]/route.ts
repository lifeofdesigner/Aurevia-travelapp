import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminBookingStatusInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateAdminBookingStatus} from "@/server/admin/bookings-manager-service";

export async function PATCH(
  request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    const actor = await requireAdminApiUser("bookings.edit");
    const input = parseAdminBookingStatusInput(await request.json());

    await updateAdminBookingStatus({
      actor,
      bookingId: params.bookingId,
      status: input.status
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/bookings`);
      revalidatePath(`/${locale}/admin/bookings/${params.bookingId}`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid booking status update."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update the booking.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
