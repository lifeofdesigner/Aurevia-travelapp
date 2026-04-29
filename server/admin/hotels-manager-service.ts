import "server-only";

import {createAdminAuditLog} from "@/server/admin/audit";
import {saveGlobalSiteSetting} from "@/server/admin/site-settings-service";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";
import {type AdminStaffIdentity} from "@/features/admin/types";
import type {
  AdminFeaturedHotelProperty,
  AdminHiddenHotelProperty,
  AdminHotelBookingRecord,
  AdminHotelMarkupRule,
  AdminHotelsManagerData,
  AdminHotelSearchRecord
} from "@/features/admin/lib/hotels-manager-types";

type HotelManagerSection = "featuredProperties" | "hiddenProperties" | "markupRules";

const SETTINGS_KEYS: Record<HotelManagerSection, string> = {
  featuredProperties: "admin_hotel_featured_properties",
  hiddenProperties: "admin_hotel_hidden_properties",
  markupRules: "admin_hotel_markup_rules"
};

const SETTINGS_DESCRIPTIONS: Record<HotelManagerSection, string> = {
  featuredProperties: "Admin-managed featured hotel properties.",
  hiddenProperties: "Admin-managed hidden hotel properties.",
  markupRules: "Admin-managed hotel markup rules."
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

export async function getAdminHotelsManagerData(): Promise<AdminHotelsManagerData> {
  const admin = createSupabaseAdminClient();
  const [searchesResult, bookingsResult, settingsResult] = await Promise.all([
    admin
      .from("search_logs")
      .select("id, created_at, destination_query, departure_date, return_date, result_count")
      .eq("booking_type", "hotel")
      .order("created_at", {ascending: false})
      .limit(30),
    admin
      .from("bookings")
      .select(
        "id, booking_reference, customer_email, customer_user_id, status, payment_status, created_at"
      )
      .eq("primary_booking_type", "hotel")
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
      result_count: number;
      return_date: string | null;
    }> | null) ?? []).map(
      (search): AdminHotelSearchRecord => ({
        checkInDate: search.departure_date,
        checkOutDate: search.return_date,
        createdAt: search.created_at,
        destinationQuery: search.destination_query,
        id: search.id,
        resultCount: search.result_count
      })
    );

  const bookings =
    ((bookingsResult.data as Array<{
      booking_reference: string;
      created_at: string;
      customer_email: string;
      customer_user_id: string;
      id: string;
      payment_status: AdminHotelBookingRecord["paymentStatus"];
      status: AdminHotelBookingRecord["status"];
    }> | null) ?? []);

  const bookingIds = bookings.map((booking) => booking.id);
  const userIds = Array.from(new Set(bookings.map((booking) => booking.customer_user_id)));
  const [bookingItemsResult, hotelBookingsResult, profilesResult] = await Promise.all([
    bookingIds.length > 0
      ? admin
          .from("booking_items")
          .select("id, booking_id")
          .in("booking_id", bookingIds)
          .eq("booking_type", "hotel")
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
  const filteredHotelBookingsResult = bookingItemIds.length
    ? await admin
        .from("hotel_bookings")
        .select("booking_item_id, property_name, check_in_date, check_out_date")
        .in("booking_item_id", bookingItemIds)
    : {data: []};
  const hotelBookings =
    ((filteredHotelBookingsResult.data as Array<{
      booking_item_id: string;
      check_in_date: string;
      check_out_date: string;
      property_name: string;
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
  const hotelBookingByItemId = new Map(
    hotelBookings.map((booking) => [booking.booking_item_id, booking] as const)
  );
  const bookingItemByBookingId = new Map(
    bookingItems.map((item) => [item.booking_id, item.id] as const)
  );

  const hotelBookingRecords: AdminHotelBookingRecord[] = bookings
    .map((booking) => {
      const bookingItemId = bookingItemByBookingId.get(booking.id);
      const hotelBooking = bookingItemId
        ? hotelBookingByItemId.get(bookingItemId)
        : undefined;

      if (!hotelBooking) {
        return null;
      }

      return {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        checkInDate: hotelBooking.check_in_date,
        checkOutDate: hotelBooking.check_out_date,
        createdAt: booking.created_at,
        customerEmail: booking.customer_email,
        customerName:
          profileMap.get(booking.customer_user_id) ?? booking.customer_email,
        paymentStatus: booking.payment_status,
        propertyName: hotelBooking.property_name,
        status: booking.status
      };
    })
    .filter((booking): booking is AdminHotelBookingRecord => Boolean(booking));

  const settingsRows =
    ((settingsResult.data as Array<{setting_key: string; setting_value: Json}> | null) ?? []);
  const settingsMap = new Map(
    settingsRows.map((row) => [row.setting_key, row.setting_value] as const)
  );

  return {
    bookings: hotelBookingRecords,
    featuredProperties: parseJsonArray<AdminFeaturedHotelProperty>(
      settingsMap.get(SETTINGS_KEYS.featuredProperties),
      []
    ),
    hiddenProperties: parseJsonArray<AdminHiddenHotelProperty>(
      settingsMap.get(SETTINGS_KEYS.hiddenProperties),
      []
    ),
    markupRules: parseJsonArray<AdminHotelMarkupRule>(
      settingsMap.get(SETTINGS_KEYS.markupRules),
      []
    ),
    searches
  };
}

export async function saveAdminHotelsManagerSection({
  actor,
  items,
  section
}: {
  actor: AdminStaffIdentity;
  items: AdminFeaturedHotelProperty[] | AdminHiddenHotelProperty[] | AdminHotelMarkupRule[];
  section: HotelManagerSection;
}) {
  const settingValue = await saveGlobalSiteSetting({
    description: SETTINGS_DESCRIPTIONS[section],
    key: SETTINGS_KEYS[section],
    value: asJson(items)
  });

  await createAdminAuditLog({
    action: `admin.hotels.${section}.updated`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "site_settings",
    metadata: {
      itemCount: items.length,
      section
    }
  });

  return (settingValue ?? []) as
    | AdminFeaturedHotelProperty[]
    | AdminHiddenHotelProperty[]
    | AdminHotelMarkupRule[];
}
