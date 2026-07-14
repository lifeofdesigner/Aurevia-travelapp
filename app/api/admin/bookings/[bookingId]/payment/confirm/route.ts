import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {confirmAdminPaymentManually} from "@/server/admin/bookings-manager-service";

export async function POST(
  _request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    const actor = await requireAdminApiUser("bookings.edit");

    await confirmAdminPaymentManually({
      actor,
      bookingId: params.bookingId
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to confirm the payment.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
