import {type NextRequest, NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {parseTourBookingPayload} from "@/features/tours/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {resolveBookingCustomerUserId} from "@/server/customer-access/guest-checkout";
import {createPendingTourBooking} from "@/server/tours/booking-service";
import {getCachedTourOffer} from "@/server/tours/offer-service";

const bookingRouteBodySchema = z.object({
  locale: z.enum(locales),
  offerId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    const rawBody = (await request.json()) as unknown;
    const bodyMeta = bookingRouteBodySchema.parse(rawBody);
    const cachedOffer = await getCachedTourOffer(bodyMeta.offerId);

    if (!cachedOffer) {
      return NextResponse.json(
        {
          message: "The selected activity offer is no longer available."
        },
        {status: 404}
      );
    }

    const payload = parseTourBookingPayload(rawBody, cachedOffer.offer);
    const userId = await resolveBookingCustomerUserId({
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      existingUserId: user?.id ?? null,
      supabase
    });
    const confirmation = await createPendingTourBooking({
      locale: bodyMeta.locale,
      payload,
      userId
    });

    return NextResponse.json(confirmation, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid activity booking request."
        },
        {status: 400}
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create the pending activity booking.";

    return NextResponse.json(
      {
        message
      },
      {status: message.startsWith("Sign in is required") ? 401 : 500}
    );
  }
}
