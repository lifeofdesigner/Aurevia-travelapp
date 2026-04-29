import "server-only";

import {type Json} from "@/types/supabase";
import {type TourBookingConfirmation, type TourBookingPayload} from "@/features/tours/types";
import {buildTourBookingQuote} from "@/features/tours/lib/pricing";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {getCachedTourOffer} from "./offer-service";

type CreatePendingTourBookingInput = {
  locale: Locale;
  payload: TourBookingPayload;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

export async function createPendingTourBooking({
  locale,
  payload,
  userId
}: CreatePendingTourBookingInput): Promise<TourBookingConfirmation> {
  const admin = createSupabaseAdminClient();
  const cachedTour = await getCachedTourOffer(payload.offerId);

  if (!cachedTour) {
    throw new Error("The selected activity offer is no longer available.");
  }

  const {offer} = cachedTour;
  const selectedAddOnCodes = payload.selectedAddOnCodes ?? [];
  const quote = buildTourBookingQuote(offer, {
    adults: payload.adults,
    children: payload.children,
    selectedAddOnCodes,
    slotId: payload.slotId
  });
  const bookingInsert = await admin
    .from("bookings")
    .insert({
      billing_address_snapshot: {} as Json,
      created_by_user_id: userId,
      currency_code: quote.totalAmount.currency,
      customer_email: payload.contactEmail,
      customer_phone: payload.contactPhone ?? null,
      customer_user_id: userId,
      discount_amount_minor: 0,
      expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      locale,
      metadata: toJson({
        leadTraveler: {
          firstName: payload.leadTravelerFirstName,
          lastName: payload.leadTravelerLastName
        },
        participantCounts: {
          adults: payload.adults,
          children: payload.children
        },
        searchLogId: payload.searchLogId ?? null,
        selectedAddOnCodes,
        selectedSlotId: payload.slotId,
        specialRequests: payload.specialRequests ?? null
      }),
      payment_status: "pending",
      primary_booking_type: "tour",
      status: "pending_payment",
      subtotal_amount_minor: quote.subtotalAmount.amountMinor,
      tax_amount_minor: quote.taxAmount.amountMinor,
      total_amount_minor: quote.totalAmount.amountMinor,
      traveler_summary: toJson([
        {
          firstName: payload.leadTravelerFirstName,
          lastName: payload.leadTravelerLastName,
          role: "lead_traveler",
          travelerType: "adult"
        },
        {
          count: payload.adults,
          travelerType: "adult"
        },
        {
          count: payload.children,
          travelerType: "child"
        }
      ])
    })
    .select("id, booking_reference")
    .single();
  const booking =
    (bookingInsert.data as {booking_reference: string; id: string} | null) ?? null;

  if (!booking) {
    throw new Error("Unable to create the pending activity booking.");
  }

  const bookingItemInsert = await admin
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      booking_type: "tour",
      currency_code: quote.totalAmount.currency,
      description: `${offer.category} | ${quote.selectedSlot.label}`,
      discount_amount_minor: 0,
      quantity: quote.participantTotal,
      service_end_at: quote.selectedSlot.endsAt,
      service_start_at: quote.selectedSlot.startsAt,
      snapshot_payload: toJson({
      contactSnapshot: {
        email: payload.contactEmail,
        phone: payload.contactPhone ?? null
      },
      offer,
        participantCounts: {
          adults: payload.adults,
          children: payload.children
        },
        selectedAddOns: quote.selectedAddOns,
        selectedSlot: quote.selectedSlot,
        specialRequests: payload.specialRequests ?? null
      }),
      status: "pending_payment",
      subtotal_amount_minor: quote.subtotalAmount.amountMinor,
      supplier_id: "45454545-4545-4545-4545-454545454545",
      supplier_offer_id: offer.supplierOfferId,
      tax_amount_minor: quote.taxAmount.amountMinor,
      title: offer.title,
      total_amount_minor: quote.totalAmount.amountMinor
    })
    .select("id")
    .single();
  const bookingItem = (bookingItemInsert.data as {id: string} | null) ?? null;

  if (!bookingItem) {
    throw new Error("Unable to create the activity booking item.");
  }

  await admin.from("tour_bookings").insert({
    booking_item_id: bookingItem.id,
    cancellation_policy: toJson({
      policy: offer.cancellationPolicy,
      selectedSlot: quote.selectedSlot
    }),
    destination_id: offer.destinationId,
    duration_minutes: offer.durationMinutes,
    exclusions: toJson(offer.exclusions),
    inclusions: toJson(offer.inclusions),
    meeting_point: offer.meetingPoint,
    service_date: offer.serviceDate,
    starts_at: quote.selectedSlot.startsAt,
    ticket_delivery_method: offer.ticketDeliveryMethod,
    title: offer.title
  });

  await admin.from("booking_travelers").insert({
    booking_id: booking.id,
    booking_item_id: bookingItem.id,
    first_name: payload.leadTravelerFirstName,
    last_name: payload.leadTravelerLastName,
    traveler_snapshot: toJson({
      participantCounts: {
        adults: payload.adults,
        children: payload.children
      },
      role: "lead_traveler"
    }),
    traveler_type: "adult"
  });

  if (payload.searchLogId) {
    await admin
      .from("search_logs")
      .update({
        converted_booking_id: booking.id
      })
      .eq("id", payload.searchLogId);
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    currency: quote.totalAmount.currency,
    status: "pending_payment",
    totalAmountMinor: quote.totalAmount.amountMinor
  };
}
