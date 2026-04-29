import "server-only";

import {type Json} from "@/types/supabase";
import {type Locale} from "@/lib/i18n/routing";
import {type TransferBookingConfirmation, type TransferBookingPayload} from "@/features/transfers/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {getCachedTransferOffer} from "./offer-service";

type CreatePendingTransferBookingInput = {
  locale: Locale;
  payload: TransferBookingPayload;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

export async function createPendingTransferBooking({
  locale,
  payload,
  userId
}: CreatePendingTransferBookingInput): Promise<TransferBookingConfirmation> {
  const admin = createSupabaseAdminClient();
  const offer = await getCachedTransferOffer(payload.offerId);

  if (!offer) {
    throw new Error("The selected transfer offer is no longer available.");
  }

  const bookingInsert = await admin
    .from("bookings")
    .insert({
      billing_address_snapshot: {} as Json,
      created_by_user_id: userId,
      currency_code: offer.totalAmount.currency,
      customer_email: payload.contactEmail,
      customer_phone: payload.contactPhone ?? null,
      customer_user_id: userId,
      discount_amount_minor: 0,
      expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      locale,
      metadata: toJson({
        flightNumber: payload.flightNumber ?? null,
        leadPassenger: {
          firstName: payload.leadPassengerFirstName,
          lastName: payload.leadPassengerLastName
        },
        routeMode: offer.routeMode,
        searchLogId: payload.searchLogId ?? null,
        specialRequests: payload.specialRequests ?? null
      }),
      payment_status: "pending",
      primary_booking_type: "airport_transfer",
      status: "pending_payment",
      subtotal_amount_minor: offer.subtotalAmount.amountMinor,
      tax_amount_minor: offer.taxAmount.amountMinor,
      total_amount_minor: offer.totalAmount.amountMinor,
      traveler_summary: toJson([
        {
          firstName: payload.leadPassengerFirstName,
          lastName: payload.leadPassengerLastName,
          travelerType: "adult"
        }
      ])
    })
    .select("id, booking_reference")
    .single();
  const booking =
    (bookingInsert.data as {booking_reference: string; id: string} | null) ?? null;

  if (!booking) {
    throw new Error("Unable to create the pending transfer booking.");
  }

  const bookingItemInsert = await admin
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      booking_type: "airport_transfer",
      currency_code: offer.totalAmount.currency,
      description: `${offer.vehicleName} · ${offer.vehicleClass}`,
      discount_amount_minor: 0,
      quantity: 1,
      service_end_at: offer.pickupAt,
      service_start_at: offer.pickupAt,
      snapshot_payload: toJson({
        flightNumber: payload.flightNumber ?? null,
        leadPassenger: {
          firstName: payload.leadPassengerFirstName,
          lastName: payload.leadPassengerLastName
        },
        offer,
        specialRequests: payload.specialRequests ?? null
      }),
      status: "pending_payment",
      subtotal_amount_minor: offer.subtotalAmount.amountMinor,
      supplier_id: "34343434-3434-3434-3434-343434343434",
      supplier_offer_id: offer.supplierOfferId,
      tax_amount_minor: offer.taxAmount.amountMinor,
      title: offer.vehicleName,
      total_amount_minor: offer.totalAmount.amountMinor
    })
    .select("id")
    .single();
  const bookingItem = (bookingItemInsert.data as {id: string} | null) ?? null;

  if (!bookingItem) {
    throw new Error("Unable to create the transfer booking item.");
  }

  await admin.from("airport_transfer_bookings").insert({
    booking_item_id: bookingItem.id,
    dropoff_airport_code: offer.dropoffAirportCode ?? null,
    dropoff_city_id: offer.dropoffCityId,
    dropoff_location_label: offer.dropoffLocationLabel,
    luggage_count: offer.luggageCount,
    meet_and_greet: offer.meetAndGreetIncluded,
    passenger_count: offer.passengerCount,
    pickup_airport_code: offer.pickupAirportCode ?? null,
    pickup_at: offer.pickupAt,
    pickup_city_id: offer.pickupCityId,
    pickup_location_label: offer.pickupLocationLabel,
    transfer_type: offer.vehicleClass,
    vehicle_name: offer.vehicleName
  });

  await admin.from("booking_travelers").insert({
    booking_id: booking.id,
    booking_item_id: bookingItem.id,
    first_name: payload.leadPassengerFirstName,
    last_name: payload.leadPassengerLastName,
    traveler_snapshot: toJson({
      role: "lead_passenger"
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
    currency: offer.totalAmount.currency,
    status: "pending_payment",
    totalAmountMinor: offer.totalAmount.amountMinor
  };
}
