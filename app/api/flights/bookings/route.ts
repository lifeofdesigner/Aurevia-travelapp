import {type NextRequest, NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {createSupabaseServerClient} from "@/lib/supabase/server";
import {locales} from "@/lib/i18n/routing";
import {resolveBookingCustomerUserId} from "@/server/customer-access/guest-checkout";
import {createPendingFlightBooking} from "@/server/flights/booking-service";
import {getCachedFlightOffer} from "@/server/flights/offer-service";
import {parseFlightBookingPayload} from "@/features/flights/lib/schemas";

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
    const cachedOffer = await getCachedFlightOffer(bodyMeta.offerId);

    if (!cachedOffer) {
      return NextResponse.json(
        {
          message: "The selected flight offer is no longer available."
        },
        {status: 404}
      );
    }

    const travelerCount =
      cachedOffer.offer.passengerCounts.adults +
      cachedOffer.offer.passengerCounts.children +
      cachedOffer.offer.passengerCounts.infants;
    const payload = parseFlightBookingPayload(rawBody, travelerCount);
    const userId = await resolveBookingCustomerUserId({
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      existingUserId: user?.id ?? null,
      supabase
    });
    const confirmation = await createPendingFlightBooking({
      locale: bodyMeta.locale,
      payload,
      userId
    });

    return NextResponse.json(confirmation, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid booking request."
        },
        {status: 400}
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to create the pending booking.";

    return NextResponse.json(
      {
        message
      },
      {status: message.startsWith("Sign in is required") ? 401 : 500}
    );
  }
}
