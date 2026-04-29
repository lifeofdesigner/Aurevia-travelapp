import "server-only";

import {type Json} from "@/types/supabase";
import {type Locale} from "@/lib/i18n/routing";
import {type CarBookingConfirmation, type CarBookingPayload} from "@/features/cars/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {getCachedCarOffer} from "./offer-service";

type CreatePendingCarBookingInput = {
  locale: Locale;
  payload: CarBookingPayload;
  userId: string;
};

function toJson(value: unknown) {
  return value as Json;
}

export async function createPendingCarBooking({
  locale,
  payload,
  userId
}: CreatePendingCarBookingInput): Promise<CarBookingConfirmation> {
  const admin = createSupabaseAdminClient();
  const offer = await getCachedCarOffer(payload.offerId);

  if (!offer) {
    throw new Error("The selected rental offer is no longer available.");
  }

  const bookingInsert = await admin
    .from("bookings")
    .insert({
      billing_address_snapshot: {} as Json,
      created_by_user_id: userId,
      currency_code: offer.currency,
      customer_email: payload.contactEmail,
      customer_phone: payload.contactPhone ?? null,
      customer_user_id: userId,
      discount_amount_minor: 0,
      expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      locale,
      metadata: toJson({
        driver: {
          firstName: payload.driverFirstName,
          lastName: payload.driverLastName
        },
        searchLogId: payload.searchLogId ?? null,
        specialRequests: payload.specialRequests ?? null,
        vehicleName: offer.vehicleName,
        vendorName: offer.vendorName
      }),
      payment_status: "pending",
      primary_booking_type: "car_rental",
      status: "pending_payment",
      subtotal_amount_minor: offer.subtotalAmount.amountMinor,
      tax_amount_minor: offer.taxAmount.amountMinor,
      total_amount_minor: offer.totalAmount.amountMinor,
      traveler_summary: toJson([
        {
          firstName: payload.driverFirstName,
          lastName: payload.driverLastName,
          travelerType: "adult"
        }
      ])
    })
    .select("id, booking_reference")
    .single();
  const booking =
    (bookingInsert.data as {booking_reference: string; id: string} | null) ?? null;

  if (!booking) {
    throw new Error("Unable to create the pending car booking.");
  }

  const bookingItemInsert = await admin
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      booking_type: "car_rental",
      currency_code: offer.currency,
      description: `${offer.vendorName} · ${offer.vehicleCategory}`,
      discount_amount_minor: 0,
      quantity: 1,
      service_end_at: offer.dropoffAt,
      service_start_at: offer.pickupAt,
      snapshot_payload: toJson({
        driver: {
          firstName: payload.driverFirstName,
          lastName: payload.driverLastName
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
    throw new Error("Unable to create the rental booking item.");
  }

  await admin.from("car_rental_bookings").insert({
    booking_item_id: bookingItem.id,
    driver_age_min: offer.driverAgeMin,
    fuel_policy: offer.fuelPolicy,
    insurance_snapshot: toJson({
      bagCount: offer.bagCount,
      doorCount: offer.doorCount,
      highlights: offer.highlights,
      insuranceSummary: offer.insuranceSummary,
      seatCount: offer.seatCount
    }),
    mileage_policy: offer.mileagePolicy,
    pickup_airport_code: offer.pickupAirportCode ?? null,
    pickup_at: offer.pickupAt,
    pickup_city_id: offer.pickupCityId,
    pickup_location_label: offer.pickupLocationLabel,
    return_airport_code: offer.dropoffAirportCode ?? null,
    return_at: offer.dropoffAt,
    return_city_id: offer.dropoffCityId,
    return_location_label: offer.dropoffLocationLabel,
    transmission_type: offer.transmissionType,
    vehicle_category: offer.vehicleCategory,
    vehicle_name: offer.vehicleName
  });

  await admin.from("booking_travelers").insert({
    booking_id: booking.id,
    booking_item_id: bookingItem.id,
    first_name: payload.driverFirstName,
    last_name: payload.driverLastName,
    traveler_snapshot: toJson({
      role: "lead_driver"
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
    currency: offer.currency,
    status: "pending_payment",
    totalAmountMinor: offer.totalAmount.amountMinor
  };
}
