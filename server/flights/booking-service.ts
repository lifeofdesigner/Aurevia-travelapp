import "server-only";

import {
  type FlightBookingConfirmation,
  type FlightBookingPayload,
  type FlightTravelerFormValue
} from "@/features/flights/types";
import {type SupportedCurrency} from "@/lib/money";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {getCachedFlightOffer} from "./offer-service";

type FlightBookingCreationInput = {
  locale: "en" | "de";
  payload: FlightBookingPayload;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

function buildTravelerSummary(travelers: FlightTravelerFormValue[]) {
  return travelers.map((traveler) => ({
    dateOfBirth: traveler.dateOfBirth ?? null,
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    travelerType: traveler.travelerType
  }));
}

export async function createPendingFlightBooking({
  locale,
  payload,
  userId
}: FlightBookingCreationInput): Promise<FlightBookingConfirmation> {
  const admin = createSupabaseAdminClient();
  const cachedOffer = await getCachedFlightOffer(payload.offerId);

  if (!cachedOffer) {
    throw new Error("The selected flight offer could not be found.");
  }

  const {offer, supplierId} = cachedOffer;
  const firstLeg = offer.legs[0];
  const firstSegment = firstLeg.segments[0];
  const finalLeg = offer.legs[offer.legs.length - 1];
  const finalSegment = finalLeg.segments[finalLeg.segments.length - 1];

  const bookingInsert = await admin
    .from("bookings")
    .insert({
      created_by_user_id: userId,
      currency_code: offer.totalAmount.currency,
      customer_email: payload.contactEmail,
      customer_phone: payload.contactPhone ?? null,
      customer_user_id: userId,
      locale,
      metadata: toJson({
        baggageSummary: offer.baggageSummary,
        searchLogId: payload.searchLogId ?? null,
        specialRequests: payload.specialRequests ?? null
      }),
      payment_status: "pending",
      primary_booking_type: "flight",
      status: "pending_payment",
      subtotal_amount_minor: offer.baseAmount.amountMinor,
      tax_amount_minor: offer.taxAmount.amountMinor,
      total_amount_minor: offer.totalAmount.amountMinor,
      traveler_summary: toJson(buildTravelerSummary(payload.travelers))
    })
    .select("booking_reference, id")
    .single();

  if (bookingInsert.error || !bookingInsert.data) {
    throw new Error(bookingInsert.error?.message ?? "Unable to create the booking record.");
  }

  const booking = bookingInsert.data as {
    booking_reference: string;
    id: string;
  };

  const bookingItemInsert = await admin
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      booking_type: "flight",
      currency_code: offer.totalAmount.currency,
      description: `${offer.airlineNames.join(", ")} itinerary`,
      discount_amount_minor: 0,
      position: 1,
      service_end_at: finalSegment.arrivalAt,
      service_start_at: firstSegment.departureAt,
      snapshot_payload: toJson({
        baggageSummary: offer.baggageSummary,
        contactSnapshot: {
          email: payload.contactEmail,
          phone: payload.contactPhone ?? null
        },
        fareConditions: offer.fareConditions,
        offer,
        specialRequests: payload.specialRequests ?? null
      }),
      status: "pending_payment",
      subtotal_amount_minor: offer.baseAmount.amountMinor,
      supplier_id: supplierId,
      supplier_offer_id: offer.supplierOfferId,
      tax_amount_minor: offer.taxAmount.amountMinor,
      title: `${offer.originAirportCode} to ${offer.destinationAirportCode}`,
      total_amount_minor: offer.totalAmount.amountMinor
    })
    .select("id")
    .single();

  if (bookingItemInsert.error || !bookingItemInsert.data?.id) {
    throw new Error(
      bookingItemInsert.error?.message ?? "Unable to create the booking item record."
    );
  }

  const bookingItemId = (bookingItemInsert.data as {id: string}).id;

  const savedTravelerProfileIds: Array<string | null> = [];

  if (payload.saveTravelerProfiles) {
    for (const traveler of payload.travelers) {
      const travelerInsert = await admin
        .from("traveler_profiles")
        .insert({
          date_of_birth: traveler.dateOfBirth ?? null,
          first_name: traveler.firstName,
          last_name: traveler.lastName,
          owner_user_id: userId,
          relationship_label:
            traveler.travelerType === "adult" ? "Traveler" : "Dependent",
          traveler_type: traveler.travelerType
        })
        .select("id")
        .single();

      savedTravelerProfileIds.push(
        travelerInsert.data ? (travelerInsert.data as {id: string}).id : null
      );
    }
  }

  const travelerInsert = await admin.from("booking_travelers").insert(
    payload.travelers.map((traveler, index) => ({
      booking_id: booking.id,
      booking_item_id: bookingItemId,
      date_of_birth: traveler.dateOfBirth ?? null,
      first_name: traveler.firstName,
      last_name: traveler.lastName,
      traveler_profile_id: savedTravelerProfileIds[index] ?? null,
      traveler_snapshot: toJson(traveler),
      traveler_type: traveler.travelerType
    }))
  );

  if (travelerInsert.error) {
    throw new Error(travelerInsert.error.message);
  }

  const flightBookingInsert = await admin
    .from("flight_bookings")
    .insert({
      baggage_policy: toJson(offer.baggageSummary),
      booking_item_id: bookingItemId,
      cabin_class: offer.cabinClass,
      departure_date: offer.departureDate,
      destination_airport_code: offer.destinationAirportCode,
      fare_rules: toJson(offer.fareConditions),
      origin_airport_code: offer.originAirportCode,
      return_date: offer.returnDate ?? null,
      ticketing_deadline_at: offer.fareConditions.ticketingDeadlineAt ?? null,
      trip_type: offer.tripType
    })
    .select("id")
    .single();

  if (flightBookingInsert.error || !flightBookingInsert.data?.id) {
    throw new Error(
      flightBookingInsert.error?.message ?? "Unable to create the flight booking record."
    );
  }

  const flightBookingId = (flightBookingInsert.data as {id: string}).id;
  const segmentsInsert = await admin.from("flight_segment_snapshots").insert(
    offer.legs.flatMap((leg) =>
      leg.segments.map((segment, index) => ({
        aircraft_code: segment.aircraftCode ?? null,
        arrival_at: segment.arrivalAt,
        baggage_allowance: toJson(segment.baggageAllowance ?? {}),
        cabin_class: segment.cabinClass,
        departure_at: segment.departureAt,
        destination_airport_code: segment.destinationAirportCode,
        duration_minutes: segment.durationMinutes,
        fare_class_code: segment.fareClassCode ?? null,
        flight_booking_id: flightBookingId,
        flight_number: segment.flightNumber,
        marketing_airline_code: segment.marketingAirlineCode,
        operating_airline_code: segment.operatingAirlineCode ?? null,
        origin_airport_code: segment.originAirportCode,
        segment_index: leg.legIndex * 10 + index + 1,
        segment_snapshot: toJson(segment)
      }))
    )
  );

  if (segmentsInsert.error) {
    throw new Error(segmentsInsert.error.message);
  }

  if (payload.searchLogId) {
    const searchLogLookup = await admin
      .from("search_logs")
      .select("id, user_id")
      .eq("id", payload.searchLogId)
      .single();

    if (searchLogLookup.data) {
      const row = searchLogLookup.data as {id: string; user_id: string | null};

      if (!row.user_id || row.user_id === userId) {
        await admin
          .from("search_logs")
          .update({converted_booking_id: booking.id})
          .eq("id", row.id);
      }
    }
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    currency: offer.totalAmount.currency as SupportedCurrency,
    status: "pending_payment",
    totalAmountMinor: offer.totalAmount.amountMinor
  };
}

export async function getOwnedFlightBookingSummary(
  bookingId: string,
  userId: string
) {
  const admin = createSupabaseAdminClient();
  const bookingResponse = await admin
    .from("bookings")
    .select("booking_reference, currency_code, status, total_amount_minor, customer_user_id")
    .eq("id", bookingId)
    .single();

  if (bookingResponse.error || !bookingResponse.data) {
    return null;
  }

  const booking = bookingResponse.data as {
    booking_reference: string;
    currency_code: SupportedCurrency;
    customer_user_id: string;
    status: string;
    total_amount_minor: number;
  };

  if (booking.customer_user_id !== userId) {
    return null;
  }

  const itemResponse = await admin
    .from("booking_items")
    .select("title, description, service_start_at, service_end_at")
    .eq("booking_id", bookingId)
    .eq("booking_type", "flight")
    .single();

  return {
    bookingId,
    bookingReference: booking.booking_reference,
    currency: booking.currency_code,
    description:
      (itemResponse.data as {description?: string | null})?.description ?? null,
    serviceEndAt:
      (itemResponse.data as {service_end_at?: string | null})?.service_end_at ?? null,
    serviceStartAt:
      (itemResponse.data as {service_start_at?: string | null})?.service_start_at ?? null,
    status: booking.status,
    title: (itemResponse.data as {title?: string | null})?.title ?? null,
    totalAmountMinor: booking.total_amount_minor
  };
}
