import "server-only";

import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {asRecord} from "./utils";

export type PrivacyDataInventory = {
  addressesCount: number;
  bookingsCount: number;
  consentRecordsCount: number;
  dataRequestsCount: number;
  financeRecordsCount: number;
  notificationsCount: number;
  supportTicketsCount: number;
  travelerProfilesCount: number;
  uploadsCount: number;
  visaApplicationsCount: number;
};

type CountRow = {
  user_id?: string | null;
  owner_user_id?: string | null;
  customer_user_id?: string | null;
  applicant_user_id?: string | null;
};

function createEmptyInventory(): PrivacyDataInventory {
  return {
    addressesCount: 0,
    bookingsCount: 0,
    consentRecordsCount: 0,
    dataRequestsCount: 0,
    financeRecordsCount: 0,
    notificationsCount: 0,
    supportTicketsCount: 0,
    travelerProfilesCount: 0,
    uploadsCount: 0,
    visaApplicationsCount: 0
  };
}

function incrementInventory(
  map: Map<string, PrivacyDataInventory>,
  userId: string,
  key: keyof PrivacyDataInventory
) {
  const current = map.get(userId) ?? createEmptyInventory();
  current[key] += 1;
  map.set(userId, current);
}

function getOwnerId(row: CountRow) {
  return (
    row.user_id ??
    row.owner_user_id ??
    row.customer_user_id ??
    row.applicant_user_id ??
    null
  );
}

export async function getUserDataInventories(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const inventoryMap = new Map<string, PrivacyDataInventory>();

  for (const userId of uniqueUserIds) {
    inventoryMap.set(userId, createEmptyInventory());
  }

  if (uniqueUserIds.length === 0) {
    return inventoryMap;
  }

  const admin = createSupabaseAdminClient();
  const [
    addressesResult,
    bookingsResult,
    cookieConsentResult,
    privacyConsentResult,
    dataRequestsResult,
    invoicesResult,
    notificationsResult,
    paymentsResult,
    refundsResult,
    supportTicketsResult,
    travelerProfilesResult,
    uploadsResult,
    visaApplicationsResult
  ] = await Promise.all([
    admin.from("addresses").select("owner_user_id").in("owner_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("bookings").select("customer_user_id").in("customer_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("cookie_consent_records").select("user_id").in("user_id", uniqueUserIds),
    admin.from("privacy_consent_records").select("user_id").in("user_id", uniqueUserIds),
    admin.from("data_requests").select("user_id").in("user_id", uniqueUserIds),
    admin.from("invoices").select("user_id").in("user_id", uniqueUserIds),
    admin.from("notifications").select("owner_user_id").in("owner_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("payments").select("user_id").in("user_id", uniqueUserIds),
    admin.from("refunds").select("user_id").in("user_id", uniqueUserIds),
    admin.from("support_tickets").select("owner_user_id").in("owner_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("traveler_profiles").select("owner_user_id").in("owner_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("uploads").select("owner_user_id").in("owner_user_id", uniqueUserIds).is("deleted_at", null),
    admin.from("visa_applications").select("applicant_user_id").in("applicant_user_id", uniqueUserIds).is("deleted_at", null)
  ]);

  for (const row of ((addressesResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "addressesCount");
    }
  }

  for (const row of ((bookingsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "bookingsCount");
    }
  }

  for (const result of [cookieConsentResult, privacyConsentResult] as const) {
    for (const row of ((result.data as CountRow[] | null) ?? [])) {
      const userId = getOwnerId(row);
      if (userId) {
        incrementInventory(inventoryMap, userId, "consentRecordsCount");
      }
    }
  }

  for (const row of ((dataRequestsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "dataRequestsCount");
    }
  }

  for (const result of [invoicesResult, paymentsResult, refundsResult] as const) {
    for (const row of ((result.data as CountRow[] | null) ?? [])) {
      const userId = getOwnerId(row);
      if (userId) {
        incrementInventory(inventoryMap, userId, "financeRecordsCount");
      }
    }
  }

  for (const row of ((notificationsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "notificationsCount");
    }
  }

  for (const row of ((supportTicketsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "supportTicketsCount");
    }
  }

  for (const row of ((travelerProfilesResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "travelerProfilesCount");
    }
  }

  for (const row of ((uploadsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "uploadsCount");
    }
  }

  for (const row of ((visaApplicationsResult.data as CountRow[] | null) ?? [])) {
    const userId = getOwnerId(row);
    if (userId) {
      incrementInventory(inventoryMap, userId, "visaApplicationsCount");
    }
  }

  return inventoryMap;
}

export async function getUserDataInventory(userId: string) {
  const inventories = await getUserDataInventories([userId]);
  return inventories.get(userId) ?? createEmptyInventory();
}

export async function buildUserDataExportPayload(userId: string) {
  const admin = createSupabaseAdminClient();
  const [
    profileResult,
    preferencesResult,
    addressesResult,
    travelerProfilesResult,
    documentsResult,
    bookingsResult,
    paymentsResult,
    invoicesResult,
    refundsResult,
    visaApplicationsResult,
    uploadsResult,
    cookieConsentResult,
    privacyConsentResult,
    dataRequestsResult,
    notificationsResult,
    supportTicketsResult
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", userId).is("deleted_at", null).maybeSingle(),
    admin.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("addresses").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("traveler_profiles").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("saved_passenger_documents").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("bookings").select("*").eq("customer_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("payments").select("*").eq("user_id", userId).order("created_at", {ascending: true}),
    admin.from("invoices").select("*").eq("user_id", userId).order("created_at", {ascending: true}),
    admin.from("refunds").select("*").eq("user_id", userId).order("created_at", {ascending: true}),
    admin.from("visa_applications").select("*").eq("applicant_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("uploads").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("cookie_consent_records").select("*").eq("user_id", userId).order("recorded_at", {ascending: true}),
    admin.from("privacy_consent_records").select("*").eq("user_id", userId).order("recorded_at", {ascending: true}),
    admin.from("data_requests").select("*").eq("user_id", userId).order("created_at", {ascending: true}),
    admin.from("notifications").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true}),
    admin.from("support_tickets").select("*").eq("owner_user_id", userId).is("deleted_at", null).order("created_at", {ascending: true})
  ]);
  const bookings = ((bookingsResult.data as Array<{id: string} & Record<string, Json>> | null) ?? []);
  const bookingIds = bookings.map((booking) => booking.id);
  const [bookingItemsResult, bookingTravelersResult] =
    bookingIds.length > 0
      ? await Promise.all([
          admin.from("booking_items").select("*").in("booking_id", bookingIds).order("position", {ascending: true}),
          admin.from("booking_travelers").select("*").in("booking_id", bookingIds).order("created_at", {ascending: true})
        ])
      : [{data: []}, {data: []}];

  return {
    exportedAt: new Date().toISOString(),
    userId,
    inventory: await getUserDataInventory(userId),
    sections: {
      addresses: (addressesResult.data as Record<string, Json>[] | null) ?? [],
      bookings,
      bookingItems: (bookingItemsResult.data as Record<string, Json>[] | null) ?? [],
      bookingTravelers: (bookingTravelersResult.data as Record<string, Json>[] | null) ?? [],
      cookieConsentRecords: (cookieConsentResult.data as Record<string, Json>[] | null) ?? [],
      dataRequests: (dataRequestsResult.data as Record<string, Json>[] | null) ?? [],
      invoices: (invoicesResult.data as Record<string, Json>[] | null) ?? [],
      notifications: (notificationsResult.data as Record<string, Json>[] | null) ?? [],
      payments: (paymentsResult.data as Record<string, Json>[] | null) ?? [],
      privacyConsentRecords: (privacyConsentResult.data as Record<string, Json>[] | null) ?? [],
      profile: profileResult.data ? asRecord(profileResult.data as Json) : null,
      refunds: (refundsResult.data as Record<string, Json>[] | null) ?? [],
      supportTickets: (supportTicketsResult.data as Record<string, Json>[] | null) ?? [],
      travelerProfiles: (travelerProfilesResult.data as Record<string, Json>[] | null) ?? [],
      userPreferences: preferencesResult.data ? asRecord(preferencesResult.data as Json) : null,
      uploads: (uploadsResult.data as Record<string, Json>[] | null) ?? [],
      visaApplications: (visaApplicationsResult.data as Record<string, Json>[] | null) ?? [],
      travelerDocuments: (documentsResult.data as Record<string, Json>[] | null) ?? []
    }
  };
}
