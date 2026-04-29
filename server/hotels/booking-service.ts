import "server-only";

import {type Json} from "@/types/supabase";
import {type HotelBookingConfirmation, type HotelBookingPayload} from "@/features/hotels/types";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {getCachedHotelOffer} from "./offer-service";

type CreatePendingHotelBookingInput = {
  locale: Locale;
  payload: HotelBookingPayload;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

function toServiceDate(date: string, hour: string) {
  return `${date}T${hour}:00Z`;
}

export async function createPendingHotelBooking({
  locale,
  payload,
  userId
}: CreatePendingHotelBookingInput): Promise<HotelBookingConfirmation> {
  const admin = createSupabaseAdminClient();
  const cachedHotel = await getCachedHotelOffer(payload.offerId);

  if (!cachedHotel || !cachedHotel.selectedRoom) {
    throw new Error("The selected stay offer is no longer available.");
  }

  const {offer, selectedRoom} = cachedHotel;
  const bookingInsert = await admin
    .from("bookings")
    .insert({
      billing_address_snapshot: {} as Json,
      created_by_user_id: userId,
      currency_code: selectedRoom.totalAmount.currency,
      customer_email: payload.contactEmail,
      customer_phone: payload.contactPhone ?? null,
      customer_user_id: userId,
      discount_amount_minor: 0,
      expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      locale,
      metadata: toJson({
        propertyCode: offer.propertyCode,
        roomCode: selectedRoom.roomCode,
        searchLogId: payload.searchLogId ?? null,
        specialRequests: payload.specialRequests ?? null
      }),
      payment_status: "pending",
      primary_booking_type: "hotel",
      status: "pending_payment",
      subtotal_amount_minor: selectedRoom.subtotalAmount.amountMinor,
      tax_amount_minor: selectedRoom.taxAmount.amountMinor,
      total_amount_minor: selectedRoom.totalAmount.amountMinor,
      traveler_summary: toJson(
        payload.guests.map((guest) => ({
          firstName: guest.firstName,
          guestType: guest.guestType,
          lastName: guest.lastName
        }))
      )
    })
    .select("id, booking_reference")
    .single();
  const booking =
    (bookingInsert.data as {booking_reference: string; id: string} | null) ?? null;

  if (!booking) {
    throw new Error("Unable to create the pending stay booking.");
  }

  const bookingItemInsert = await admin
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      booking_type: "hotel",
      currency_code: selectedRoom.totalAmount.currency,
      description: `${selectedRoom.roomName} · ${offer.neighborhood}`,
      discount_amount_minor: 0,
      quantity: selectedRoom.quantity,
      service_end_at: toServiceDate(offer.checkOut, "10:00"),
      service_start_at: toServiceDate(offer.checkIn, "15:00"),
      snapshot_payload: toJson({
        offer,
        selectedRoom
      }),
      status: "pending_payment",
      subtotal_amount_minor: selectedRoom.subtotalAmount.amountMinor,
      supplier_id: "23232323-2323-2323-2323-232323232323",
      supplier_offer_id: selectedRoom.supplierOfferId,
      tax_amount_minor: selectedRoom.taxAmount.amountMinor,
      title: offer.propertyName,
      total_amount_minor: selectedRoom.totalAmount.amountMinor
    })
    .select("id")
    .single();
  const bookingItem = (bookingItemInsert.data as {id: string} | null) ?? null;

  if (!bookingItem) {
    throw new Error("Unable to create the stay booking item.");
  }

  const hotelBookingInsert = await admin
    .from("hotel_bookings")
    .insert({
      board_type: selectedRoom.rateType,
      booking_item_id: bookingItem.id,
      cancellation_policy: toJson({
        propertyPolicy: offer.policies.cancellation,
        roomPolicy: selectedRoom.cancellationSummary
      }),
      check_in_date: offer.checkIn,
      check_out_date: offer.checkOut,
      guest_count: offer.guestCount,
      night_count: offer.nightCount,
      property_address_snapshot: toJson({
        addressLine: offer.addressLine,
        cityName: offer.cityName,
        countryCode: offer.countryCode,
        latitude: offer.latitude,
        longitude: offer.longitude,
        neighborhood: offer.neighborhood
      }),
      property_city_id: offer.cityId,
      property_country_code: offer.countryCode,
      property_name: offer.propertyName,
      room_count: offer.roomCount
    })
    .select("id")
    .single();
  const hotelBooking = (hotelBookingInsert.data as {id: string} | null) ?? null;

  if (!hotelBooking) {
    throw new Error("Unable to create the hotel booking snapshot.");
  }

  await admin.from("hotel_room_snapshots").insert({
    currency_code: selectedRoom.totalAmount.currency,
    guest_count: offer.guestCount,
    hotel_booking_id: hotelBooking.id,
    quantity: selectedRoom.quantity,
    rate_type: selectedRoom.rateType,
    room_index: 1,
    room_name: selectedRoom.roomName,
    room_snapshot: toJson({
      amenities: selectedRoom.amenities,
      bedsSummary: selectedRoom.bedsSummary,
      breakfastIncluded: selectedRoom.breakfastIncluded,
      cancellationSummary: selectedRoom.cancellationSummary,
      description: selectedRoom.description,
      guestCapacity: selectedRoom.guestCapacity,
      imageUrl: selectedRoom.imageUrl,
      roomCode: selectedRoom.roomCode,
      sizeSqm: selectedRoom.sizeSqm
    }),
    subtotal_amount_minor: selectedRoom.subtotalAmount.amountMinor,
    tax_amount_minor: selectedRoom.taxAmount.amountMinor,
    total_amount_minor: selectedRoom.totalAmount.amountMinor
  });

  await admin.from("booking_travelers").insert(
    payload.guests.map((guest) => ({
      booking_id: booking.id,
      booking_item_id: bookingItem.id,
      first_name: guest.firstName,
      last_name: guest.lastName,
      traveler_snapshot: toJson({
        guestType: guest.guestType
      }),
      traveler_type: guest.guestType
    }))
  );

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
    currency: selectedRoom.totalAmount.currency,
    status: "pending_payment",
    totalAmountMinor: selectedRoom.totalAmount.amountMinor
  };
}
