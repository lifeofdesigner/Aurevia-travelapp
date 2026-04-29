import "server-only";

import {createAdminAuditLog} from "@/server/admin/audit";
import {saveGlobalSiteSetting} from "@/server/admin/site-settings-service";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";
import {type AdminStaffIdentity} from "@/features/admin/types";
import type {
  AdminFeaturedFlightRoute,
  AdminFlightAirlineVisibility,
  AdminFlightBaggageOverride,
  AdminFlightBookingRecord,
  AdminFlightMarkupRule,
  AdminFlightsManagerData,
  AdminFlightSearchRecord
} from "@/features/admin/lib/flights-manager-types";

type FlightManagerSection =
  | "airlineVisibility"
  | "baggageOverrides"
  | "featuredRoutes"
  | "markupRules";

const SETTINGS_KEYS: Record<FlightManagerSection, string> = {
  airlineVisibility: "admin_flight_airline_visibility",
  baggageOverrides: "admin_flight_baggage_overrides",
  featuredRoutes: "admin_flight_featured_routes",
  markupRules: "admin_flight_markup_rules"
};

const SETTINGS_DESCRIPTIONS: Record<FlightManagerSection, string> = {
  airlineVisibility: "Admin-managed flight airline visibility rules.",
  baggageOverrides: "Admin-managed flight baggage override messages.",
  featuredRoutes: "Admin-managed featured flight routes.",
  markupRules: "Admin-managed flight markup rules."
};

function asJson(value: unknown) {
  return value as Json;
}

function buildPersonName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
}

function parseJsonArray<T>(value: Json | null | undefined, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export async function getAdminFlightsManagerData(): Promise<AdminFlightsManagerData> {
  const admin = createSupabaseAdminClient();
  const [searchesResult, bookingsResult, settingsResult] = await Promise.all([
    admin
      .from("search_logs")
      .select(
        "id, created_at, origin_query, destination_query, departure_date, return_date, result_count"
      )
      .eq("booking_type", "flight")
      .order("created_at", {ascending: false})
      .limit(30),
    admin
      .from("bookings")
      .select(
        "id, booking_reference, customer_email, customer_user_id, status, payment_status, created_at"
      )
      .eq("primary_booking_type", "flight")
      .is("deleted_at", null)
      .order("created_at", {ascending: false})
      .limit(25),
    admin
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", Object.values(SETTINGS_KEYS))
      .is("locale", null)
  ]);

  const searches =
    ((searchesResult.data as Array<{
      created_at: string;
      departure_date: string | null;
      destination_query: string | null;
      id: string;
      origin_query: string | null;
      result_count: number;
      return_date: string | null;
    }> | null) ?? []).map(
      (search): AdminFlightSearchRecord => ({
        createdAt: search.created_at,
        departureDate: search.departure_date,
        destinationQuery: search.destination_query,
        id: search.id,
        originQuery: search.origin_query,
        resultCount: search.result_count,
        returnDate: search.return_date
      })
    );

  const bookings =
    ((bookingsResult.data as Array<{
      booking_reference: string;
      created_at: string;
      customer_email: string;
      customer_user_id: string;
      id: string;
      payment_status: AdminFlightBookingRecord["paymentStatus"];
      status: AdminFlightBookingRecord["status"];
    }> | null) ?? []);

  const bookingIds = bookings.map((booking) => booking.id);
  const userIds = Array.from(new Set(bookings.map((booking) => booking.customer_user_id)));
  const [bookingItemsResult, flightBookingsResult, profilesResult] = await Promise.all([
    bookingIds.length > 0
      ? admin
          .from("booking_items")
          .select("id, booking_id")
          .in("booking_id", bookingIds)
          .eq("booking_type", "flight")
      : {data: []},
    bookingIds.length > 0 ? {data: []} : {data: []},
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", userIds)
      : {data: []}
  ]);

  const bookingItems =
    ((bookingItemsResult.data as Array<{booking_id: string; id: string}> | null) ?? []);
  const bookingItemIds = bookingItems.map((item) => item.id);
  const filteredFlightBookingsResult = bookingItemIds.length
    ? await admin
        .from("flight_bookings")
        .select(
          "booking_item_id, origin_airport_code, destination_airport_code, departure_date, return_date"
        )
        .in("booking_item_id", bookingItemIds)
    : {data: []};
  const flightBookings =
    ((filteredFlightBookingsResult.data as Array<{
      booking_item_id: string;
      departure_date: string;
      destination_airport_code: string;
      origin_airport_code: string;
      return_date: string | null;
    }> | null) ?? []);
  const profiles =
    ((profilesResult.data as Array<{
      email: string;
      first_name: string | null;
      last_name: string | null;
      user_id: string;
    }> | null) ?? []);

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.user_id,
      buildPersonName(profile.first_name, profile.last_name, profile.email)
    ])
  );
  const flightBookingByItemId = new Map(
    flightBookings.map((booking) => [booking.booking_item_id, booking] as const)
  );
  const bookingItemByBookingId = new Map(
    bookingItems.map((item) => [item.booking_id, item.id] as const)
  );

  const flightBookingRecords: AdminFlightBookingRecord[] = bookings
    .map((booking) => {
      const bookingItemId = bookingItemByBookingId.get(booking.id);
      const flightBooking = bookingItemId
        ? flightBookingByItemId.get(bookingItemId)
        : undefined;

      if (!flightBooking) {
        return null;
      }

      return {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        createdAt: booking.created_at,
        customerEmail: booking.customer_email,
        customerName:
          profileMap.get(booking.customer_user_id) ?? booking.customer_email,
        departureDate: flightBooking.departure_date,
        destinationCode: flightBooking.destination_airport_code,
        originCode: flightBooking.origin_airport_code,
        paymentStatus: booking.payment_status,
        returnDate: flightBooking.return_date,
        status: booking.status
      };
    })
    .filter((booking): booking is AdminFlightBookingRecord => Boolean(booking));

  const settingsRows =
    ((settingsResult.data as Array<{setting_key: string; setting_value: Json}> | null) ?? []);
  const settingsMap = new Map(
    settingsRows.map((row) => [row.setting_key, row.setting_value] as const)
  );

  return {
    airlineVisibility: parseJsonArray<AdminFlightAirlineVisibility>(
      settingsMap.get(SETTINGS_KEYS.airlineVisibility),
      []
    ),
    baggageOverrides: parseJsonArray<AdminFlightBaggageOverride>(
      settingsMap.get(SETTINGS_KEYS.baggageOverrides),
      []
    ),
    bookings: flightBookingRecords,
    featuredRoutes: parseJsonArray<AdminFeaturedFlightRoute>(
      settingsMap.get(SETTINGS_KEYS.featuredRoutes),
      []
    ),
    markupRules: parseJsonArray<AdminFlightMarkupRule>(
      settingsMap.get(SETTINGS_KEYS.markupRules),
      []
    ),
    searches
  };
}

export async function saveAdminFlightsManagerSection({
  actor,
  items,
  section
}: {
  actor: AdminStaffIdentity;
  items:
    | AdminFeaturedFlightRoute[]
    | AdminFlightAirlineVisibility[]
    | AdminFlightBaggageOverride[]
    | AdminFlightMarkupRule[];
  section: FlightManagerSection;
}) {
  const settingValue = await saveGlobalSiteSetting({
    description: SETTINGS_DESCRIPTIONS[section],
    key: SETTINGS_KEYS[section],
    value: asJson(items)
  });

  await createAdminAuditLog({
    action: `admin.flights.${section}.updated`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "site_settings",
    metadata: {
      itemCount: items.length,
      section
    }
  });

  return (settingValue ?? []) as
    | AdminFeaturedFlightRoute[]
    | AdminFlightAirlineVisibility[]
    | AdminFlightBaggageOverride[]
    | AdminFlightMarkupRule[];
}
