import {type NextRequest, NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {initializeBankTransferForOwnedBooking} from "@/server/payments/bank-transfer-service";

const initializeBodySchema = z.object({
  bookingId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;

    if (!user) {
      const response = NextResponse.json(
        {
          message: "Sign in is required before bank transfer instructions can be created."
        },
        {status: 401}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const body = initializeBodySchema.parse((await request.json()) as unknown);
    const checkout = await initializeBankTransferForOwnedBooking({
      bookingId: body.bookingId,
      userId: user.id
    });

    const response = NextResponse.json(checkout, {status: 200});
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      const response = NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid bank transfer request."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    reportServerError("payments.bank_transfer.initialize_failed", error);
    const response = NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create bank transfer instructions."
      },
      {status: 500}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
