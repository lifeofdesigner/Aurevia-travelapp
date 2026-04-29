import {type NextRequest, NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {locales} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {createCheckoutSessionForOwnedBooking} from "@/server/payments/checkout-service";

const checkoutBodySchema = z.object({
  bookingId: z.string().uuid(),
  locale: z.enum(locales)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;

    if (!user) {
      const response = NextResponse.json(
        {
          message: "Sign in is required before payment can begin."
        },
        {status: 401}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const body = checkoutBodySchema.parse((await request.json()) as unknown);
    const checkout = await createCheckoutSessionForOwnedBooking({
      bookingId: body.bookingId,
      locale: body.locale,
      userId: user.id
    });

    const response = NextResponse.json(checkout, {status: 200});
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      const response = NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid checkout request."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    reportServerError("payments.checkout.create_failed", error);
    const response = NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create the payment session."
      },
      {status: 500}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
