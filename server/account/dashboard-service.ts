import "server-only";

import {type SupportedCurrency} from "@/lib/money";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {syncMarketingEmailConsent} from "@/server/privacy/consent-service";
import {type Json} from "@/types/supabase";
import type {
  BookingStatus,
  BookingType,
  InvoiceStatus,
  PaymentStatus,
  UserRole,
  VisaApplicationStatus
} from "@/types/database-enums";
import type {
  BookingDetailRecord,
  BookingListItem,
  BookingTravelerRecord,
  CountryOption,
  DashboardIdentity,
  DashboardOverviewRecord,
  InvoiceHistoryItem,
  PaymentHistoryItem,
  ProfileSettingsFormValues,
  ProfileSettingsRecord,
  TravelerProfileFormValues,
  TravelerProfileRecord,
  VisaApplicationDetail,
  VisaApplicationListItem
} from "@/features/account/types";
import type {VisaProductType} from "@/features/visa/types";

type BookingRow = {
  billing_address_snapshot: Json;
  booking_reference: string;
  confirmed_at: string | null;
  created_at: string;
  currency_code: SupportedCurrency;
  customer_email: string;
  customer_phone: string | null;
  customer_user_id: string;
  deleted_at: string | null;
  discount_amount_minor: number;
  id: string;
  metadata: Json;
  payment_status: PaymentStatus;
  primary_booking_type: BookingType;
  status: BookingStatus;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  total_amount_minor: number;
};

type BookingItemRow = {
  booking_id: string;
  booking_type: BookingType;
  confirmed_at: string | null;
  currency_code: SupportedCurrency;
  description: string | null;
  id: string;
  position: number;
  quantity: number;
  service_end_at: string | null;
  service_start_at: string | null;
  snapshot_payload: Json;
  status: BookingStatus;
  subtotal_amount_minor: number;
  supplier_confirmation_reference: string | null;
  tax_amount_minor: number;
  title: string;
  total_amount_minor: number;
};

type BookingTravelerRow = {
  booking_id: string;
  date_of_birth: string | null;
  document_number_last4: string | null;
  first_name: string;
  id: string;
  last_name: string;
  nationality_country_code: string | null;
  traveler_type: "adult" | "child" | "infant";
};

type ProfileRow = {
  date_of_birth: string | null;
  email: string;
  email_verified_at: string | null;
  first_name: string | null;
  last_name: string | null;
  last_signed_in_at: string | null;
  phone: string | null;
  role: UserRole;
  user_id: string;
};

type UserPreferenceRow = {
  marketing_email_opt_in: boolean;
  preferred_currency: SupportedCurrency;
  preferred_locale: "en" | "de";
  time_zone: string;
  user_id: string;
};

type AddressRow = {
  city_name: string;
  company_name: string | null;
  country_code: string;
  line_1: string;
  line_2: string | null;
  postal_code: string | null;
  recipient_name: string | null;
  state_region: string | null;
  vat_number: string | null;
};

type TravelerProfileRow = {
  date_of_birth: string | null;
  email: string | null;
  first_name: string;
  gender: string | null;
  id: string;
  is_primary: boolean;
  last_name: string;
  middle_name: string | null;
  nationality_country_code: string | null;
  owner_user_id: string;
  phone: string | null;
  relationship_label: string | null;
  residence_country_code: string | null;
  special_assistance_notes: string | null;
  traveler_type: "adult" | "child" | "infant";
};

type SavedPassengerDocumentRow = {
  document_number_last4: string | null;
  document_type:
    | "passport"
    | "national_id"
    | "residence_permit"
    | "visa"
    | "driver_license"
    | "other";
  expires_at: string | null;
  id: string;
  is_primary: boolean;
  issued_at: string | null;
  issuing_country_code: string | null;
  traveler_profile_id: string;
};

type InvoiceRow = {
  booking_id: string;
  created_at: string;
  currency_code: SupportedCurrency;
  due_at: string | null;
  id: string;
  invoice_number: string;
  paid_at: string | null;
  status: InvoiceStatus;
  subtotal_amount_minor: number;
  tax_amount_minor: number;
  total_amount_minor: number;
};

type PaymentRow = {
  amount_captured_minor: number;
  amount_refunded_minor: number;
  booking_id: string;
  created_at: string;
  currency_code: SupportedCurrency;
  id: string;
  provider_payment_reference: string | null;
  status: PaymentStatus;
};

type RefundRow = {
  amount_minor: number;
  booking_id: string;
  created_at: string;
  currency_code: SupportedCurrency;
  id: string;
  payment_id: string;
  reason: string | null;
  status: string;
};

type TaxLineRow = {
  booking_item_id: string | null;
  currency_code: SupportedCurrency;
  id: string;
  jurisdiction_country_code: string | null;
  tax_amount_minor: number;
  tax_name: string;
  tax_rate: number;
  taxable_amount_minor: number;
};

type VisaApplicationRow = {
  application_reference: string | null;
  created_at: string;
  form_data: Json;
  id: string;
  reviewed_at: string | null;
  status: VisaApplicationStatus;
  submitted_at: string | null;
  updated_at: string;
  visa_country_code: string;
};

type UploadRow = {
  access_path?: string;
  byte_size: number;
  created_at: string;
  document_category: string;
  file_name: string;
  id: string;
  linked_entity_id: string | null;
  metadata: Json;
  mime_type: string;
};

type BookingFilters = {
  query?: string;
  status?: string;
  type?: string;
};

function asRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getVisaTypeValue(formData: Json): VisaProductType {
  const visaType = asString(asRecord(formData).visaType);

  if (visaType === "business" || visaType === "student") {
    return visaType;
  }

  return "tourist";
}

function getPrimaryDocumentMap(rows: SavedPassengerDocumentRow[]) {
  return new Map(
    rows
      .filter((row) => row.is_primary)
      .map((row) => [
        row.traveler_profile_id,
        {
          documentNumberLast4: row.document_number_last4 ?? "",
          documentType: row.document_type,
          expiresAt: row.expires_at ?? "",
          id: row.id,
          issuedAt: row.issued_at ?? "",
          issuingCountryCode: row.issuing_country_code ?? "",
          isPrimary: row.is_primary
        }
      ])
  );
}

function buildBookingListItems(args: {
  bookings: BookingRow[];
  invoices: InvoiceRow[];
  items: BookingItemRow[];
  refunds: RefundRow[];
  travelers: BookingTravelerRow[];
}): BookingListItem[] {
  const itemMap = new Map<string, BookingItemRow[]>();
  const invoiceMap = new Map<string, InvoiceRow>();
  const refundMap = new Map<string, RefundRow[]>();
  const travelerCountMap = new Map<string, number>();

  for (const invoice of args.invoices) {
    if (!invoiceMap.has(invoice.booking_id)) {
      invoiceMap.set(invoice.booking_id, invoice);
    }
  }

  for (const item of args.items) {
    const existing = itemMap.get(item.booking_id) ?? [];
    existing.push(item);
    itemMap.set(item.booking_id, existing);
  }

  for (const refund of args.refunds) {
    const existing = refundMap.get(refund.booking_id) ?? [];
    existing.push(refund);
    refundMap.set(refund.booking_id, existing);
  }

  for (const traveler of args.travelers) {
    travelerCountMap.set(
      traveler.booking_id,
      (travelerCountMap.get(traveler.booking_id) ?? 0) + 1
    );
  }

  return args.bookings.map((booking) => {
    const bookingItems = (itemMap.get(booking.id) ?? []).sort(
      (left, right) => left.position - right.position
    );
    const firstItem = bookingItems[0] ?? null;
    const invoice = invoiceMap.get(booking.id) ?? null;
    const refunds = refundMap.get(booking.id) ?? [];

    return {
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      confirmedAt: booking.confirmed_at,
      createdAt: booking.created_at,
      currency: booking.currency_code,
      firstItemDescription: firstItem?.description ?? null,
      firstItemTitle: firstItem?.title ?? null,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoice_number ?? null,
      invoiceStatus: invoice?.status ?? null,
      itemCount: bookingItems.length,
      paymentStatus: booking.payment_status,
      primaryBookingType: booking.primary_booking_type,
      refundAmountMinor: refunds.reduce((total, refund) => total + refund.amount_minor, 0),
      refundCount: refunds.length,
      status: booking.status,
      totalAmountMinor: booking.total_amount_minor,
      travelerCount: travelerCountMap.get(booking.id) ?? 0
    };
  });
}

function mapProfileSettingsRecord(
  profile: ProfileRow | null,
  preferences: UserPreferenceRow | null,
  billingAddress: AddressRow | null
): ProfileSettingsRecord {
  return {
    billingAddress: billingAddress
      ? {
          cityName: billingAddress.city_name,
          companyName: billingAddress.company_name ?? "",
          countryCode: billingAddress.country_code,
          line1: billingAddress.line_1,
          line2: billingAddress.line_2 ?? "",
          postalCode: billingAddress.postal_code ?? "",
          recipientName: billingAddress.recipient_name ?? "",
          stateRegion: billingAddress.state_region ?? "",
          vatNumber: billingAddress.vat_number ?? ""
        }
      : null,
    dateOfBirth: profile?.date_of_birth ?? "",
    email: profile?.email ?? "",
    emailVerifiedAt: profile?.email_verified_at ?? null,
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    lastSignedInAt: profile?.last_signed_in_at ?? null,
    marketingEmailOptIn: preferences?.marketing_email_opt_in ?? false,
    phone: profile?.phone ?? "",
    preferredCurrency: preferences?.preferred_currency ?? "EUR",
    preferredLocale: preferences?.preferred_locale ?? "en",
    role: profile?.role ?? "customer",
    timeZone: preferences?.time_zone ?? "Europe/Vienna",
    userId: profile?.user_id ?? preferences?.user_id ?? ""
  };
}

export async function getDashboardIdentity(userId: string): Promise<DashboardIdentity | null> {
  const admin = createSupabaseAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("user_id, email, first_name, last_name, role")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const profile = (profileResult.data as ProfileRow | null) ?? null;

  if (!profile) {
    return null;
  }

  return {
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    userId: profile.user_id
  };
}

export async function listAccountCountries(): Promise<CountryOption[]> {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("countries")
    .select("code, name")
    .eq("is_active", true)
    .order("name", {ascending: true});
  const countries = (result.data as Array<{code: string; name: string}> | null) ?? [];

  return countries.map((country) => ({
    code: country.code,
    name: country.name
  }));
}

export async function getProfileSettingsForUser(
  userId: string
): Promise<ProfileSettingsRecord | null> {
  const admin = createSupabaseAdminClient();
  const [profileResult, preferencesResult, addressResult] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "user_id, email, first_name, last_name, phone, date_of_birth, email_verified_at, last_signed_in_at, role"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("user_preferences")
      .select("user_id, preferred_locale, preferred_currency, time_zone, marketing_email_opt_in")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("addresses")
      .select(
        "recipient_name, company_name, line_1, line_2, city_name, state_region, postal_code, country_code, vat_number"
      )
      .eq("owner_user_id", userId)
      .eq("address_type", "billing")
      .is("deleted_at", null)
      .order("is_default", {ascending: false})
      .order("created_at", {ascending: false})
      .limit(1)
      .maybeSingle()
  ]);

  const profile = (profileResult.data as ProfileRow | null) ?? null;
  const preferences = (preferencesResult.data as UserPreferenceRow | null) ?? null;
  const address = (addressResult.data as AddressRow | null) ?? null;

  if (!profile && !preferences) {
    return null;
  }

  return mapProfileSettingsRecord(profile, preferences, address);
}

export async function updateProfileSettingsForUser(
  userId: string,
  values: ProfileSettingsFormValues
) {
  const admin = createSupabaseAdminClient();
  const profileUpdate = await admin
    .from("profiles")
    .update({
      date_of_birth: values.dateOfBirth || null,
      first_name: values.firstName || null,
      last_name: values.lastName || null,
      phone: values.phone || null
    })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (profileUpdate.error) {
    throw new Error(profileUpdate.error.message);
  }

  const preferencesUpdate = await admin
    .from("user_preferences")
    .update({
      marketing_email_opt_in: values.marketingEmailOptIn,
      preferred_currency: values.preferredCurrency,
      preferred_locale: values.preferredLocale
    })
    .eq("user_id", userId);

  if (preferencesUpdate.error) {
    throw new Error(preferencesUpdate.error.message);
  }

  await syncMarketingEmailConsent({
    granted: values.marketingEmailOptIn,
    locale: values.preferredLocale,
    source: "profile_settings",
    userId
  });

  const existingAddressResult = await admin
    .from("addresses")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("address_type", "billing")
    .is("deleted_at", null)
    .order("is_default", {ascending: false})
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const existingAddress = (existingAddressResult.data as {id: string} | null) ?? null;
  const hasAnyBillingValue = [
    values.billingAddressLine1,
    values.billingAddressLine2,
    values.billingAddressCityName,
    values.billingAddressStateRegion,
    values.billingAddressPostalCode,
    values.billingAddressCountryCode,
    values.billingAddressCompanyName,
    values.billingAddressRecipientName,
    values.billingAddressVatNumber
  ].some((entry) => entry.length > 0);

  if (hasAnyBillingValue) {
    const payload = {
      address_type: "billing",
      city_name: values.billingAddressCityName,
      company_name: values.billingAddressCompanyName || null,
      country_code: values.billingAddressCountryCode,
      is_default: true,
      line_1: values.billingAddressLine1,
      line_2: values.billingAddressLine2 || null,
      owner_user_id: userId,
      postal_code: values.billingAddressPostalCode || null,
      recipient_name: values.billingAddressRecipientName || null,
      state_region: values.billingAddressStateRegion || null,
      vat_number: values.billingAddressVatNumber || null
    };

    if (existingAddress?.id) {
      const addressUpdate = await admin.from("addresses").update(payload).eq("id", existingAddress.id);

      if (addressUpdate.error) {
        throw new Error(addressUpdate.error.message);
      }
    } else {
      const addressInsert = await admin.from("addresses").insert(payload);

      if (addressInsert.error) {
        throw new Error(addressInsert.error.message);
      }
    }
  } else if (existingAddress?.id) {
    const addressDelete = await admin
      .from("addresses")
      .update({
        deleted_at: new Date().toISOString(),
        is_default: false
      })
      .eq("id", existingAddress.id);

    if (addressDelete.error) {
      throw new Error(addressDelete.error.message);
    }
  }

  return getProfileSettingsForUser(userId);
}

async function syncPrimaryTravelerDocument(
  userId: string,
  travelerId: string,
  values: TravelerProfileFormValues
) {
  const admin = createSupabaseAdminClient();
  const existingResult = await admin
    .from("saved_passenger_documents")
    .select(
      "id, traveler_profile_id, document_type, issuing_country_code, document_number_last4, issued_at, expires_at, is_primary"
    )
    .eq("owner_user_id", userId)
    .eq("traveler_profile_id", travelerId)
    .is("deleted_at", null)
    .order("created_at", {ascending: true});
  const existingDocuments =
    (existingResult.data as SavedPassengerDocumentRow[] | null) ?? [];

  if (!values.documentType) {
    if (existingDocuments.length > 0) {
      const deleteResult = await admin
        .from("saved_passenger_documents")
        .update({
          deleted_at: new Date().toISOString(),
          is_primary: false
        })
        .eq("traveler_profile_id", travelerId)
        .eq("owner_user_id", userId)
        .is("deleted_at", null);

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message);
      }
    }

    return;
  }

  const payload = {
    document_number_last4: values.documentNumberLast4 || null,
    document_type: values.documentType,
    expires_at: values.expiresAt || null,
    is_primary: true,
    issued_at: values.issuedAt || null,
    issuing_country_code: values.issuingCountryCode || null,
    metadata: {},
    owner_user_id: userId,
    traveler_profile_id: travelerId,
    upload_id: null
  };

  if (existingDocuments.length === 0) {
    const insertResult = await admin.from("saved_passenger_documents").insert(payload);

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }

    return;
  }

  const [primaryDocument, ...otherDocuments] = existingDocuments;
  const updateResult = await admin
    .from("saved_passenger_documents")
    .update(payload)
    .eq("id", primaryDocument.id);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  if (otherDocuments.length > 0) {
    const otherIds = otherDocuments.map((document) => document.id);
    const cleanupResult = await admin
      .from("saved_passenger_documents")
      .update({
        deleted_at: new Date().toISOString(),
        is_primary: false
      })
      .in("id", otherIds);

    if (cleanupResult.error) {
      throw new Error(cleanupResult.error.message);
    }
  }
}

export async function listTravelerProfilesForUser(
  userId: string
): Promise<TravelerProfileRecord[]> {
  const admin = createSupabaseAdminClient();
  const travelerResult = await admin
    .from("traveler_profiles")
    .select(
      "id, owner_user_id, relationship_label, traveler_type, first_name, last_name, middle_name, date_of_birth, gender, nationality_country_code, residence_country_code, phone, email, special_assistance_notes, is_primary"
    )
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .order("is_primary", {ascending: false})
    .order("created_at", {ascending: true});
  const travelers = (travelerResult.data as TravelerProfileRow[] | null) ?? [];
  const travelerIds = travelers.map((traveler) => traveler.id);

  const documentsResult =
    travelerIds.length > 0
      ? await admin
          .from("saved_passenger_documents")
          .select(
            "id, traveler_profile_id, document_type, issuing_country_code, document_number_last4, issued_at, expires_at, is_primary"
          )
          .eq("owner_user_id", userId)
          .is("deleted_at", null)
          .in("traveler_profile_id", travelerIds)
      : {data: []};
  const documents =
    (documentsResult.data as SavedPassengerDocumentRow[] | null) ?? [];
  const documentMap = getPrimaryDocumentMap(documents);

  return travelers.map((traveler) => ({
    dateOfBirth: traveler.date_of_birth ?? "",
    email: traveler.email ?? "",
    firstName: traveler.first_name,
    gender: traveler.gender ?? "",
    id: traveler.id,
    isPrimary: traveler.is_primary,
    lastName: traveler.last_name,
    middleName: traveler.middle_name ?? "",
    nationalityCountryCode: traveler.nationality_country_code ?? "",
    phone: traveler.phone ?? "",
    primaryDocument: documentMap.get(traveler.id) ?? null,
    relationshipLabel: traveler.relationship_label ?? "",
    residenceCountryCode: traveler.residence_country_code ?? "",
    specialAssistanceNotes: traveler.special_assistance_notes ?? "",
    travelerType: traveler.traveler_type
  }));
}

export async function createTravelerProfileForUser(
  userId: string,
  values: TravelerProfileFormValues
) {
  const admin = createSupabaseAdminClient();

  if (values.isPrimary) {
    const clearPrimaryResult = await admin
      .from("traveler_profiles")
      .update({
        is_primary: false
      })
      .eq("owner_user_id", userId)
      .is("deleted_at", null);

    if (clearPrimaryResult.error) {
      throw new Error(clearPrimaryResult.error.message);
    }
  }

  const insertResult = await admin
    .from("traveler_profiles")
    .insert({
      date_of_birth: values.dateOfBirth || null,
      email: values.email || null,
      first_name: values.firstName,
      gender: values.gender || null,
      is_primary: values.isPrimary,
      last_name: values.lastName,
      middle_name: values.middleName || null,
      nationality_country_code: values.nationalityCountryCode || null,
      owner_user_id: userId,
      phone: values.phone || null,
      relationship_label: values.relationshipLabel || null,
      residence_country_code: values.residenceCountryCode || null,
      special_assistance_notes: values.specialAssistanceNotes || null,
      traveler_type: values.travelerType
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data?.id) {
    throw new Error(insertResult.error?.message ?? "Unable to create the traveler profile.");
  }

  const travelerId = (insertResult.data as {id: string}).id;
  await syncPrimaryTravelerDocument(userId, travelerId, values);
  return listTravelerProfilesForUser(userId);
}

export async function updateTravelerProfileForUser(
  userId: string,
  travelerId: string,
  values: TravelerProfileFormValues
) {
  const admin = createSupabaseAdminClient();
  const existingResult = await admin
    .from("traveler_profiles")
    .select("id")
    .eq("id", travelerId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existingResult.data) {
    throw new Error("Traveler profile not found.");
  }

  if (values.isPrimary) {
    const clearPrimaryResult = await admin
      .from("traveler_profiles")
      .update({
        is_primary: false
      })
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .neq("id", travelerId);

    if (clearPrimaryResult.error) {
      throw new Error(clearPrimaryResult.error.message);
    }
  }

  const updateResult = await admin
    .from("traveler_profiles")
    .update({
      date_of_birth: values.dateOfBirth || null,
      email: values.email || null,
      first_name: values.firstName,
      gender: values.gender || null,
      is_primary: values.isPrimary,
      last_name: values.lastName,
      middle_name: values.middleName || null,
      nationality_country_code: values.nationalityCountryCode || null,
      phone: values.phone || null,
      relationship_label: values.relationshipLabel || null,
      residence_country_code: values.residenceCountryCode || null,
      special_assistance_notes: values.specialAssistanceNotes || null,
      traveler_type: values.travelerType
    })
    .eq("id", travelerId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  await syncPrimaryTravelerDocument(userId, travelerId, values);
  return listTravelerProfilesForUser(userId);
}

export async function deleteTravelerProfileForUser(userId: string, travelerId: string) {
  const admin = createSupabaseAdminClient();
  const deletedAt = new Date().toISOString();
  const travelerDelete = await admin
    .from("traveler_profiles")
    .update({
      deleted_at: deletedAt,
      is_primary: false
    })
    .eq("id", travelerId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);

  if (travelerDelete.error) {
    throw new Error(travelerDelete.error.message);
  }

  const documentDelete = await admin
    .from("saved_passenger_documents")
    .update({
      deleted_at: deletedAt,
      is_primary: false
    })
    .eq("traveler_profile_id", travelerId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);

  if (documentDelete.error) {
    throw new Error(documentDelete.error.message);
  }

  return listTravelerProfilesForUser(userId);
}

export async function getDashboardOverviewForUser(
  userId: string
): Promise<DashboardOverviewRecord> {
  const admin = createSupabaseAdminClient();
  const [
    totalBookingsResult,
    pendingPaymentsResult,
    travelerCountResult,
    activeVisaCountResult,
    bookingsResult,
    invoicesResult,
    refundsResult,
    visaApplicationsResult,
    uploadsResult
  ] = await Promise.all([
    admin
      .from("bookings")
      .select("id", {count: "exact", head: true})
      .eq("customer_user_id", userId)
      .is("deleted_at", null),
    admin
      .from("bookings")
      .select("id", {count: "exact", head: true})
      .eq("customer_user_id", userId)
      .eq("status", "pending_payment")
      .is("deleted_at", null),
    admin
      .from("traveler_profiles")
      .select("id", {count: "exact", head: true})
      .eq("owner_user_id", userId)
      .is("deleted_at", null),
    admin
      .from("visa_applications")
      .select("id", {count: "exact", head: true})
      .eq("applicant_user_id", userId)
      .in("status", ["draft", "submitted", "in_review", "needs_changes", "action_required"])
      .is("deleted_at", null),
    admin
      .from("bookings")
      .select(
        "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, confirmed_at, customer_email, customer_phone, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, billing_address_snapshot, metadata, customer_user_id, deleted_at"
      )
      .eq("customer_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", {ascending: false})
      .limit(4),
    admin
      .from("invoices")
      .select(
        "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at, due_at, paid_at"
      )
      .eq("user_id", userId)
      .order("created_at", {ascending: false})
      .limit(4),
    admin
      .from("refunds")
      .select("id, booking_id, payment_id, amount_minor, currency_code, status, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", {ascending: false}),
    admin
      .from("visa_applications")
      .select(
        "id, visa_country_code, application_reference, status, submitted_at, reviewed_at, created_at, updated_at, form_data"
      )
      .eq("applicant_user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", {ascending: false})
      .limit(4),
    admin
      .from("uploads")
      .select(
        "id, linked_entity_id, file_name, mime_type, byte_size, document_category, created_at, metadata"
      )
      .eq("owner_user_id", userId)
      .eq("linked_entity_type", "visa_application")
      .is("deleted_at", null)
  ]);

  const bookings = (bookingsResult.data as BookingRow[] | null) ?? [];
  const bookingIds = bookings.map((booking) => booking.id);
  const [itemsResult, travelersResult, invoicesForBookingsResult] =
    bookingIds.length > 0
      ? await Promise.all([
          admin
            .from("booking_items")
            .select(
              "id, booking_id, position, booking_type, title, description, service_start_at, service_end_at, quantity, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code, supplier_confirmation_reference, snapshot_payload, status, confirmed_at"
            )
            .in("booking_id", bookingIds)
            .order("position", {ascending: true}),
          admin
            .from("booking_travelers")
            .select(
              "id, booking_id, first_name, last_name, traveler_type, date_of_birth, nationality_country_code, document_number_last4"
            )
            .in("booking_id", bookingIds),
          admin
            .from("invoices")
            .select(
              "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at, due_at, paid_at"
            )
            .eq("user_id", userId)
            .in("booking_id", bookingIds)
            .order("created_at", {ascending: false})
        ])
      : [{data: []}, {data: []}, {data: []}];

  const recentBookings = buildBookingListItems({
    bookings,
    invoices: (invoicesForBookingsResult.data as InvoiceRow[] | null) ?? [],
    items: (itemsResult.data as BookingItemRow[] | null) ?? [],
    refunds: (refundsResult.data as RefundRow[] | null) ?? [],
    travelers: (travelersResult.data as BookingTravelerRow[] | null) ?? []
  });
  const recentInvoices = ((invoicesResult.data as InvoiceRow[] | null) ?? []).map((invoice) => {
    const matchingBooking = bookings.find((booking) => booking.id === invoice.booking_id);

    return {
      bookingId: invoice.booking_id,
      bookingReference: matchingBooking?.booking_reference ?? null,
      createdAt: invoice.created_at,
      currency: invoice.currency_code,
      dueAt: invoice.due_at,
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      paidAt: invoice.paid_at,
      status: invoice.status,
      subtotalAmountMinor: invoice.subtotal_amount_minor,
      taxAmountMinor: invoice.tax_amount_minor,
      totalAmountMinor: invoice.total_amount_minor
    } satisfies InvoiceHistoryItem;
  });
  const uploadCountMap = new Map<string, number>();

  for (const upload of ((uploadsResult.data as UploadRow[] | null) ?? [])) {
    if (!upload.linked_entity_id) {
      continue;
    }

    uploadCountMap.set(
      upload.linked_entity_id,
      (uploadCountMap.get(upload.linked_entity_id) ?? 0) + 1
    );
  }

  const recentVisaApplications = ((visaApplicationsResult.data as VisaApplicationRow[] | null) ?? []).map(
    (application) => ({
      applicationReference: application.application_reference,
      countryCode: application.visa_country_code,
      createdAt: application.created_at,
      id: application.id,
      status: application.status,
      submittedAt: application.submitted_at,
      updatedAt: application.updated_at,
      uploadCount: uploadCountMap.get(application.id) ?? 0,
      visaType: getVisaTypeValue(application.form_data)
    })
  );

  return {
    activeVisaApplicationsCount: activeVisaCountResult.count ?? 0,
    pendingPaymentBookingsCount: pendingPaymentsResult.count ?? 0,
    recentBookings,
    recentInvoices,
    recentVisaApplications,
    savedTravelersCount: travelerCountResult.count ?? 0,
    totalBookingsCount: totalBookingsResult.count ?? 0
  };
}

export async function listBookingsForUser(
  userId: string,
  filters: BookingFilters = {}
): Promise<BookingListItem[]> {
  const admin = createSupabaseAdminClient();
  let bookingsQuery = admin
    .from("bookings")
    .select(
      "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, confirmed_at, customer_email, customer_phone, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, billing_address_snapshot, metadata, customer_user_id, deleted_at"
    )
    .eq("customer_user_id", userId)
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.type) {
    bookingsQuery = bookingsQuery.eq("primary_booking_type", filters.type);
  }

  if (filters.status) {
    bookingsQuery = bookingsQuery.eq("status", filters.status);
  }

  if (filters.query) {
    bookingsQuery = bookingsQuery.or(
      `booking_reference.ilike.%${filters.query}%,customer_email.ilike.%${filters.query}%`
    );
  }

  const bookingsResult = await bookingsQuery;
  const bookings = (bookingsResult.data as BookingRow[] | null) ?? [];

  if (bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const [itemsResult, invoicesResult, refundsResult, travelersResult] = await Promise.all([
    admin
      .from("booking_items")
      .select(
        "id, booking_id, position, booking_type, title, description, service_start_at, service_end_at, quantity, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code, supplier_confirmation_reference, snapshot_payload, status, confirmed_at"
      )
      .in("booking_id", bookingIds)
      .order("position", {ascending: true}),
    admin
      .from("invoices")
      .select(
        "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at, due_at, paid_at"
      )
      .eq("user_id", userId)
      .in("booking_id", bookingIds)
      .order("created_at", {ascending: false}),
    admin
      .from("refunds")
      .select("id, booking_id, payment_id, amount_minor, currency_code, status, reason, created_at")
      .eq("user_id", userId)
      .in("booking_id", bookingIds)
      .order("created_at", {ascending: false}),
    admin
      .from("booking_travelers")
      .select(
        "id, booking_id, first_name, last_name, traveler_type, date_of_birth, nationality_country_code, document_number_last4"
      )
      .in("booking_id", bookingIds)
  ]);

  return buildBookingListItems({
    bookings,
    invoices: (invoicesResult.data as InvoiceRow[] | null) ?? [],
    items: (itemsResult.data as BookingItemRow[] | null) ?? [],
    refunds: (refundsResult.data as RefundRow[] | null) ?? [],
    travelers: (travelersResult.data as BookingTravelerRow[] | null) ?? []
  });
}

export async function getBookingDetailForUser(
  userId: string,
  bookingId: string
): Promise<BookingDetailRecord | null> {
  const admin = createSupabaseAdminClient();
  const bookingResult = await admin
    .from("bookings")
    .select(
      "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, confirmed_at, customer_email, customer_phone, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, billing_address_snapshot, metadata, customer_user_id, deleted_at"
    )
    .eq("id", bookingId)
    .eq("customer_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const booking = (bookingResult.data as BookingRow | null) ?? null;

  if (!booking) {
    return null;
  }

  const [itemsResult, travelersResult, invoiceResult, paymentResult, refundsResult] =
    await Promise.all([
      admin
        .from("booking_items")
        .select(
          "id, booking_id, position, booking_type, title, description, service_start_at, service_end_at, quantity, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code, supplier_confirmation_reference, snapshot_payload, status, confirmed_at"
        )
        .eq("booking_id", booking.id)
        .order("position", {ascending: true}),
      admin
        .from("booking_travelers")
        .select(
          "id, booking_id, first_name, last_name, traveler_type, date_of_birth, nationality_country_code, document_number_last4"
        )
        .eq("booking_id", booking.id)
        .order("created_at", {ascending: true}),
      admin
        .from("invoices")
        .select(
          "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at, due_at, paid_at"
        )
        .eq("booking_id", booking.id)
        .eq("user_id", userId)
        .order("created_at", {ascending: false})
        .limit(1)
        .maybeSingle(),
      admin
        .from("payments")
        .select(
          "id, booking_id, status, amount_captured_minor, amount_refunded_minor, currency_code, provider_payment_reference, created_at"
        )
        .eq("booking_id", booking.id)
        .eq("user_id", userId)
        .order("created_at", {ascending: false})
        .limit(1)
        .maybeSingle(),
      admin
        .from("refunds")
        .select("id, booking_id, payment_id, amount_minor, currency_code, status, reason, created_at")
        .eq("booking_id", booking.id)
        .eq("user_id", userId)
        .order("created_at", {ascending: false})
    ]);

  const invoice = (invoiceResult.data as InvoiceRow | null) ?? null;
  const payment = (paymentResult.data as PaymentRow | null) ?? null;
  const taxLinesResult = invoice?.id
    ? await admin
        .from("tax_line_items")
        .select(
          "id, booking_item_id, tax_name, tax_rate, jurisdiction_country_code, taxable_amount_minor, tax_amount_minor, currency_code"
        )
        .eq("invoice_id", invoice.id)
        .order("created_at", {ascending: true})
    : {data: []};

  return {
    billingAddress: asRecord(booking.billing_address_snapshot),
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    confirmedAt: booking.confirmed_at,
    createdAt: booking.created_at,
    currency: booking.currency_code,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    discountAmountMinor: booking.discount_amount_minor,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice?.invoice_number ?? null,
    invoiceStatus: invoice?.status ?? null,
    items: (((itemsResult.data as BookingItemRow[] | null) ?? []).map((item) => ({
      bookingItemId: item.id,
      bookingType: item.booking_type,
      currency: item.currency_code,
      description: item.description,
      quantity: item.quantity,
      serviceEndAt: item.service_end_at,
      serviceStartAt: item.service_start_at,
      snapshotPayload: asRecord(item.snapshot_payload),
      status: item.status,
      subtotalAmountMinor: item.subtotal_amount_minor,
      supplierConfirmationReference: item.supplier_confirmation_reference,
      taxAmountMinor: item.tax_amount_minor,
      title: item.title,
      totalAmountMinor: item.total_amount_minor
    })) ?? []),
    metadata: asRecord(booking.metadata),
    paymentAmountCapturedMinor: payment?.amount_captured_minor ?? 0,
    paymentAmountRefundedMinor: payment?.amount_refunded_minor ?? 0,
    paymentId: payment?.id ?? null,
    paymentStatus: payment?.status ?? booking.payment_status,
    primaryBookingType: booking.primary_booking_type,
    refunds: (((refundsResult.data as RefundRow[] | null) ?? []).map((refund) => ({
      amountMinor: refund.amount_minor,
      createdAt: refund.created_at,
      currency: refund.currency_code,
      id: refund.id,
      reason: refund.reason,
      status: refund.status
    })) ?? []),
    status: booking.status,
    subtotalAmountMinor: booking.subtotal_amount_minor,
    taxAmountMinor: booking.tax_amount_minor,
    taxLines: (((taxLinesResult.data as TaxLineRow[] | null) ?? []).map((line) => ({
      amountMinor: line.tax_amount_minor,
      bookingItemId: line.booking_item_id,
      currency: line.currency_code,
      id: line.id,
      jurisdictionCountryCode: line.jurisdiction_country_code,
      rate: line.tax_rate,
      taxableAmountMinor: line.taxable_amount_minor,
      taxName: line.tax_name
    })) ?? []),
    totalAmountMinor: booking.total_amount_minor,
    travelers: (((travelersResult.data as BookingTravelerRow[] | null) ?? []).map((traveler) => ({
      dateOfBirth: traveler.date_of_birth,
      documentNumberLast4: traveler.document_number_last4,
      firstName: traveler.first_name,
      id: traveler.id,
      lastName: traveler.last_name,
      nationalityCountryCode: traveler.nationality_country_code,
      travelerType: traveler.traveler_type
    })) ?? []) satisfies BookingTravelerRecord[]
  };
}

export async function listPaymentsAndInvoicesForUser(userId: string): Promise<{
  invoices: InvoiceHistoryItem[];
  payments: PaymentHistoryItem[];
}> {
  const admin = createSupabaseAdminClient();
  const [paymentsResult, invoicesResult, bookingsResult] = await Promise.all([
    admin
      .from("payments")
      .select(
        "id, booking_id, status, amount_captured_minor, amount_refunded_minor, currency_code, provider_payment_reference, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", {ascending: false}),
    admin
      .from("invoices")
      .select(
        "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at, due_at, paid_at"
      )
      .eq("user_id", userId)
      .order("created_at", {ascending: false}),
    admin
      .from("bookings")
      .select(
        "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, confirmed_at, customer_email, customer_phone, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, billing_address_snapshot, metadata, customer_user_id, deleted_at"
      )
      .eq("customer_user_id", userId)
      .is("deleted_at", null)
  ]);

  const bookings = (bookingsResult.data as BookingRow[] | null) ?? [];
  const bookingMap = new Map(
    bookings.map((booking) => [
      booking.id,
      {
        bookingReference: booking.booking_reference,
        primaryBookingType: booking.primary_booking_type
      }
    ])
  );
  const invoices = ((invoicesResult.data as InvoiceRow[] | null) ?? []).map((invoice) => {
    const booking = bookingMap.get(invoice.booking_id);

    return {
      bookingId: invoice.booking_id,
      bookingReference: booking?.bookingReference ?? null,
      createdAt: invoice.created_at,
      currency: invoice.currency_code,
      dueAt: invoice.due_at,
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      paidAt: invoice.paid_at,
      status: invoice.status,
      subtotalAmountMinor: invoice.subtotal_amount_minor,
      taxAmountMinor: invoice.tax_amount_minor,
      totalAmountMinor: invoice.total_amount_minor
    };
  });
  const invoiceByBooking = new Map(invoices.map((invoice) => [invoice.bookingId, invoice]));
  const payments = ((paymentsResult.data as PaymentRow[] | null) ?? []).map((payment) => {
    const booking = bookingMap.get(payment.booking_id);
    const invoice = invoiceByBooking.get(payment.booking_id);

    return {
      amountCapturedMinor: payment.amount_captured_minor,
      amountRefundedMinor: payment.amount_refunded_minor,
      bookingId: payment.booking_id,
      bookingReference: booking?.bookingReference ?? null,
      createdAt: payment.created_at,
      currency: payment.currency_code,
      id: payment.id,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      primaryBookingType: booking?.primaryBookingType ?? null,
      providerPaymentReference: payment.provider_payment_reference,
      status: payment.status
    };
  });

  return {
    invoices,
    payments
  };
}

export async function listVisaApplicationsForUser(
  userId: string
): Promise<VisaApplicationListItem[]> {
  const admin = createSupabaseAdminClient();
  const [applicationsResult, uploadsResult] = await Promise.all([
    admin
      .from("visa_applications")
      .select(
        "id, visa_country_code, application_reference, status, submitted_at, reviewed_at, created_at, updated_at, form_data"
      )
      .eq("applicant_user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", {ascending: false}),
    admin
      .from("uploads")
      .select(
        "id, linked_entity_id, file_name, mime_type, byte_size, document_category, created_at, metadata"
      )
      .eq("owner_user_id", userId)
      .eq("linked_entity_type", "visa_application")
      .is("deleted_at", null)
  ]);
  const applications = (applicationsResult.data as VisaApplicationRow[] | null) ?? [];
  const uploads = (uploadsResult.data as UploadRow[] | null) ?? [];
  const uploadCountMap = new Map<string, number>();

  for (const upload of uploads) {
    if (!upload.linked_entity_id) {
      continue;
    }

    uploadCountMap.set(
      upload.linked_entity_id,
      (uploadCountMap.get(upload.linked_entity_id) ?? 0) + 1
    );
  }

  return applications.map((application) => ({
    applicationReference: application.application_reference,
    countryCode: application.visa_country_code,
    createdAt: application.created_at,
    id: application.id,
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    uploadCount: uploadCountMap.get(application.id) ?? 0,
    visaType: getVisaTypeValue(application.form_data)
  }));
}

export async function getVisaApplicationDetailForUser(
  userId: string,
  applicationId: string
): Promise<VisaApplicationDetail | null> {
  const admin = createSupabaseAdminClient();
  const [applicationResult, uploadsResult] = await Promise.all([
    admin
      .from("visa_applications")
      .select(
        "id, visa_country_code, application_reference, status, submitted_at, reviewed_at, created_at, updated_at, form_data"
      )
      .eq("id", applicationId)
      .eq("applicant_user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("uploads")
      .select(
        "id, linked_entity_id, file_name, mime_type, byte_size, document_category, created_at, metadata"
      )
      .eq("owner_user_id", userId)
      .eq("linked_entity_type", "visa_application")
      .eq("linked_entity_id", applicationId)
      .is("deleted_at", null)
      .order("created_at", {ascending: true})
  ]);
  const application = (applicationResult.data as VisaApplicationRow | null) ?? null;

  if (!application) {
    return null;
  }

  const uploads = ((uploadsResult.data as UploadRow[] | null) ?? []).map((upload) => {
    const metadata = asRecord(upload.metadata);

    return {
      accessPath: `/api/visa/uploads/${upload.id}/access`,
      byteSize: upload.byte_size,
      createdAt: upload.created_at,
      documentCategory: upload.document_category,
      documentType: asString(metadata.documentType) || "travel_itinerary",
      fileName: upload.file_name,
      id: upload.id,
      mimeType: upload.mime_type
    };
  });

  return {
    applicationReference: application.application_reference,
    countryCode: application.visa_country_code,
    createdAt: application.created_at,
    formData: asRecord(application.form_data),
    id: application.id,
    reviewedAt: application.reviewed_at,
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    uploadCount: uploads.length,
    visaType: getVisaTypeValue(application.form_data),
    uploads
  };
}
