import {type NextRequest, NextResponse} from "next/server";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {verifyPaystackCheckoutForOwnedBooking} from "@/server/payments/paystack-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get("reference");

    if (!reference) {
      const response = NextResponse.json(
        {
          message: "A Paystack reference is required."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;

    if (!user) {
      const response = NextResponse.json(
        {
          message: "Sign in is required before payment can be verified."
        },
        {status: 401}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const result = await verifyPaystackCheckoutForOwnedBooking({
      reference,
      userId: user.id
    });

    const response = NextResponse.json(result, {status: 200});
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    reportServerError("payments.paystack.verify_failed", error);
    const response = NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to verify the Paystack payment."
      },
      {status: 500}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
