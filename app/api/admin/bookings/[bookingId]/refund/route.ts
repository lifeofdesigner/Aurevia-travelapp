import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminBookingRefundInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {createAdminBookingRefund} from "@/server/admin/bookings-manager-service";

export async function POST(
  request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    const actor = await requireAdminApiUser("bookings.refund");
    const input = parseAdminBookingRefundInput(await request.json());

    const result = await createAdminBookingRefund({
      actor,
      amountMajor: input.amountMajor,
      bookingId: params.bookingId,
      reason: input.reason
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/bookings`);
      revalidatePath(`/${locale}/admin/bookings/${params.bookingId}`);
    }

    return NextResponse.json({ok: true, result});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid refund request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to issue the refund.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
