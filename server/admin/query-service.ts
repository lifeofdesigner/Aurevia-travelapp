import "server-only";

import {isSupportedCurrency, type SupportedCurrency} from "@/lib/money";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
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
  AdminActivityItem,
  AdminBookingDetail,
  AdminBookingFilters,
  AdminBookingListItem,
  AdminCustomerFilters,
  AdminCustomerListItem,
  AdminDashboardAnalytics,
  AdminPagination,
  AdminReferenceData,
  AdminResourceKey,
  AdminSelectOption,
  AdminSupportTicketDetail,
  AdminSupportFilters,
  AdminSupportTicketItem,
  AdminVisaApplicationDetail,
  AdminVisaQueueFilters,
  AdminVisaQueueItem
} from "@/features/admin/types";

type BookingRow = {
  billing_address_snapshot: Json;
  booking_reference: string;
  confirmed_at: string | null;
  created_at: string;
  created_by_user_id: string | null;
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

type InvoiceRow = {
  booking_id: string;
  created_at: string;
  currency_code: SupportedCurrency;
  id: string;
  invoice_number: string;
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
  paid_at: string | null;
  provider_payment_reference: string | null;
  status: PaymentStatus;
};

type PaymentSummaryRow = {
  amount_captured_minor: number;
  currency_code: SupportedCurrency;
  user_id: string;
};

type RefundRow = {
  amount_minor: number;
  booking_id: string;
  created_at: string;
  currency_code: SupportedCurrency;
  id: string;
  reason: string | null;
  status: string;
};

type ProfileRow = {
  created_at: string;
  email: string;
  first_name: string | null;
  is_suspended: boolean;
  last_name: string | null;
  last_signed_in_at: string | null;
  phone: string | null;
  role: UserRole;
  updated_at: string;
  user_id: string;
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

type AdminNoteRow = {
  author_user_id: string;
  created_at: string;
  id: string;
  is_visible_to_customer: boolean;
  note_body: string;
  title: string | null;
};

type AuditRow = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_type: string;
  id: string;
};

type VisaApplicationRow = {
  applicant_user_id: string;
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
  byte_size: number;
  created_at: string;
  metadata: Json;
  file_name: string;
  id: string;
  linked_entity_id: string | null;
  mime_type: string;
};

type SupportTicketRow = {
  assigned_admin_user_id: string | null;
  booking_id: string | null;
  created_at: string;
  description: string;
  id: string;
  owner_user_id: string;
  priority: string;
  status: string;
  subject: string;
  ticket_number: string;
};

type SupportMessageRow = {
  author_user_id: string | null;
  created_at: string;
  delivery_channel: string;
  id: string;
  message_body: string;
  ticket_id: string;
  visibility: "customer" | "internal";
};

type GenericOptionRow = {
  id?: string;
  code?: string;
  iata_code?: string;
  name?: string;
  slug?: string;
  title?: string;
};

type ResourceQueryDefinition = {
  orderBy: {
    ascending?: boolean;
    column: string;
  };
  select: string;
  softDeleteColumn?: string;
  table: string;
};

const ADMIN_RESOURCE_QUERIES: Record<Exclude<AdminResourceKey, "customers">, ResourceQueryDefinition> = {
  airlines: {
    orderBy: {column: "name"},
    select: "id, country_code, iata_code, icao_code, name, is_active, updated_at",
    table: "airlines"
  },
  airports: {
    orderBy: {column: "name"},
    select:
      "id, city_id, country_code, iata_code, icao_code, name, time_zone, latitude, longitude, is_active, updated_at",
    table: "airports"
  },
  coupons: {
    orderBy: {ascending: false, column: "created_at"},
    select:
      "id, code, description, discount_type, amount_minor, percentage_bps, currency_code, max_redemptions, redemption_count, minimum_booking_value_minor, is_active, applicable_booking_types, starts_at, ends_at, metadata, updated_at, deleted_at",
    softDeleteColumn: "deleted_at",
    table: "coupons"
  },
  destinations: {
    orderBy: {column: "sort_order"},
    select:
      "id, slug, destination_type, country_code, city_id, airport_id, title, summary, hero_image_url, theme_color, tags, is_featured, sort_order, updated_at",
    table: "destinations"
  },
  "featured-content": {
    orderBy: {column: "sort_order"},
    select:
      "id, content_key, locale, destination_id, badge, title, summary, body_markdown, cta_label, cta_href, image_url, is_published, sort_order, publish_starts_at, publish_ends_at, updated_at",
    table: "featured_content"
  },
  legal: {
    orderBy: {ascending: false, column: "effective_at"},
    select:
      "id, document_key, locale, version, title, summary, body_markdown, publication_status, effective_at, published_at, checksum_sha256, is_current, updated_at",
    table: "legal_documents"
  },
  settings: {
    orderBy: {column: "setting_key"},
    select: "id, setting_key, locale, setting_value, is_public, description, updated_at",
    table: "site_settings"
  },
  suppliers: {
    orderBy: {column: "name"},
    select: "id, code, name, service_types, base_url, contact_email, is_active, configuration, updated_at",
    table: "suppliers"
  },
  "visa-products": {
    orderBy: {column: "sort_order"},
    select:
      "id, country_code, locale, service_code, slug, title, summary, content_markdown, requirement_summary, processing_timeline_summary, price_from_minor, currency_code, supports_dependents, processing_days_min, processing_days_max, is_published, sort_order, requirements, metadata, updated_at, deleted_at",
    softDeleteColumn: "deleted_at",
    table: "visa_products"
  }
};

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function buildPersonName(firstName: string | null, lastName: string | null, fallback: string) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
}

function buildProfileMap(rows: ProfileRow[]) {
  return new Map(
    rows.map((row) => [
      row.user_id,
      {
        email: row.email,
        name: buildPersonName(row.first_name, row.last_name, row.email)
      }
    ])
  );
}

function buildPagination(totalCount: number, page: number, pageSize: number): AdminPagination {
  const pageCount = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);

  return {
    page,
    pageCount,
    pageSize,
    totalCount
  };
}

function buildSpendSummary(rows: PaymentSummaryRow[]) {
  const totals = new Map<SupportedCurrency, number>();

  for (const row of rows) {
    totals.set(row.currency_code, (totals.get(row.currency_code) ?? 0) + row.amount_captured_minor);
  }

  return [...totals.entries()].map(([currency, amountMinor]) => ({
    amountMinor,
    currency
  }));
}

function normalizeFilterDateStart(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeFilterDateEndExclusive(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString();
}

export async function getAdminReferenceData(): Promise<AdminReferenceData> {
  const admin = createSupabaseAdminClient();
  const [countryResult, cityResult, airportResult, destinationResult, adminUserResult] =
    await Promise.all([
      admin.from("countries").select("code, name").order("name", {ascending: true}),
      admin.from("cities").select("id, name").order("name", {ascending: true}),
      admin
        .from("airports")
        .select("id, name, iata_code")
        .eq("is_active", true)
        .order("name", {ascending: true}),
      admin
        .from("destinations")
        .select("id, title")
        .order("sort_order", {ascending: true})
        .order("title", {ascending: true}),
      admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, role")
        .in("role", ["support", "admin", "owner"])
        .order("email", {ascending: true})
    ]);

  const countries = (((countryResult.data as Array<{code: string; name: string}> | null) ?? []).map(
    (country) => ({
      label: `${country.name} (${country.code})`,
      value: country.code
    })
  ) satisfies AdminSelectOption[]);

  const cities = (((cityResult.data as Array<{id: string; name: string}> | null) ?? []).map(
    (city) => ({
      label: city.name,
      value: city.id
    })
  ) satisfies AdminSelectOption[]);

  const airports = (((airportResult.data as Array<{id: string; iata_code: string; name: string}> | null) ?? []).map(
    (airport) => ({
      label: `${airport.name} (${airport.iata_code})`,
      value: airport.id
    })
  ) satisfies AdminSelectOption[]);

  const destinations = (((destinationResult.data as Array<{id: string; title: string}> | null) ?? []).map(
    (destination) => ({
      label: destination.title,
      value: destination.id
    })
  ) satisfies AdminSelectOption[]);

  const adminUsers = (((adminUserResult.data as Array<{
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: UserRole;
    user_id: string;
  }> | null) ?? []).map((user) => ({
    label: `${buildPersonName(user.first_name, user.last_name, user.email)} (${user.role})`,
    value: user.user_id
  })) satisfies AdminSelectOption[]);

  return {
    adminUsers,
    airports,
    cities,
    countries,
    destinations
  };
}

export async function getAdminDashboardAnalytics(): Promise<AdminDashboardAnalytics> {
  const admin = createSupabaseAdminClient();
  const [bookingResult, paymentResult, visaResult, supportResult, profileResult, routeResult] =
    await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, customer_email, customer_user_id, created_at"
      )
      .is("deleted_at", null)
      .order("created_at", {ascending: false}),
    admin
      .from("payments")
      .select("id, booking_id, amount_captured_minor, status, paid_at, created_at")
      .order("created_at", {ascending: false}),
    admin
      .from("visa_applications")
      .select("id, application_reference, status, applicant_user_id, created_at, submitted_at")
      .is("deleted_at", null)
      .order("created_at", {ascending: false}),
    admin
      .from("support_tickets")
      .select("id, status")
      .is("deleted_at", null),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, role, last_signed_in_at")
      .is("deleted_at", null),
    admin
      .from("flight_bookings")
      .select("origin_airport_code, destination_airport_code")
  ]);

  const bookings =
    ((bookingResult.data as Array<{
      booking_reference: string;
      created_at: string;
      currency_code: SupportedCurrency;
      customer_email: string;
      customer_user_id: string;
      id: string;
      payment_status: PaymentStatus;
      primary_booking_type: BookingType;
      status: BookingStatus;
      total_amount_minor: number;
    }> | null) ?? []);
  const payments =
    ((paymentResult.data as Array<{
      amount_captured_minor: number;
      booking_id: string;
      created_at: string;
      id: string;
      paid_at: string | null;
      status: PaymentStatus;
    }> | null) ?? []);
  const visaApplications =
    ((visaResult.data as Array<{
      applicant_user_id: string;
      application_reference: string | null;
      created_at: string;
      id: string;
      status: VisaApplicationStatus;
      submitted_at: string | null;
    }> | null) ?? []);
  const supportTickets =
    ((supportResult.data as Array<{id: string; status: string}> | null) ?? []);
  const profiles =
    ((profileResult.data as Array<{
      email: string;
      first_name: string | null;
      last_name: string | null;
      last_signed_in_at: string | null;
      role: UserRole;
      user_id: string;
    }> | null) ?? []);
  const flightRoutes =
    ((routeResult.data as Array<{
      destination_airport_code: string;
      origin_airport_code: string;
    }> | null) ?? []);

  const bookingVolumeByType = (["flight", "hotel", "car_rental", "airport_transfer", "tour", "visa"] as BookingType[]).map(
    (type) => ({
      label: type,
      value: bookings.filter((booking) => booking.primary_booking_type === type).length
    })
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekOffset = (startOfToday.getDay() + 6) % 7;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - weekOffset);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfThirtyDayWindow = new Date(startOfToday);
  startOfThirtyDayWindow.setDate(startOfThirtyDayWindow.getDate() - 29);

  const profileMap = buildProfileMap(
    profiles.map((profile) => ({
      created_at: now.toISOString(),
      email: profile.email,
      first_name: profile.first_name,
      is_suspended: false,
      last_name: profile.last_name,
      last_signed_in_at: profile.last_signed_in_at,
      phone: null,
      role: profile.role,
      updated_at: now.toISOString(),
      user_id: profile.user_id
    }))
  );

  const recentBookings = bookings.slice(0, 10).map((booking) => ({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    createdAt: booking.created_at,
    currency: booking.currency_code,
    customerEmail: booking.customer_email,
    customerName: profileMap.get(booking.customer_user_id)?.name ?? booking.customer_email,
    paymentStatus: booking.payment_status,
    primaryBookingType: booking.primary_booking_type,
    status: booking.status,
    totalAmountMinor: booking.total_amount_minor
  }));

  const routeCounts = new Map<string, number>();

  for (const route of flightRoutes) {
    const label = `${route.origin_airport_code}-${route.destination_airport_code}`;
    routeCounts.set(label, (routeCounts.get(label) ?? 0) + 1);
  }

  const topRoutes = [...routeCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      value
    }));

  const capturedPayments = payments.filter(
    (payment) =>
      payment.amount_captured_minor > 0 &&
      ["authorized", "paid", "partially_refunded", "refunded"].includes(payment.status)
  );

  const revenueByDay = Array.from({length: 30}, (_, index) => {
    const dayDate = new Date(startOfThirtyDayWindow);
    dayDate.setDate(startOfThirtyDayWindow.getDate() + index);
    const dayKey = dayDate.toISOString().slice(0, 10);
    const value = capturedPayments
      .filter((payment) => (payment.paid_at ?? payment.created_at).slice(0, 10) === dayKey)
      .reduce((sum, payment) => sum + payment.amount_captured_minor, 0);

    return {
      label: dayDate.toLocaleDateString("en-US", {day: "numeric", month: "short"}),
      value
    };
  });

  const bookingTimestamps = bookings.map((booking) => ({
    booking,
    timestamp: new Date(booking.created_at).getTime()
  }));
  const paymentTimestamps = capturedPayments.map((payment) => ({
    payment,
    timestamp: new Date(payment.paid_at ?? payment.created_at).getTime()
  }));
  const todayTimestamp = startOfToday.getTime();
  const weekTimestamp = startOfWeek.getTime();
  const monthTimestamp = startOfMonth.getTime();
  const activeUserWindowTimestamp = now.getTime() - 1000 * 60 * 15;
  const pendingVisaStatuses = new Set<VisaApplicationStatus>([
    "submitted",
    "in_review",
    "needs_changes",
    "action_required"
  ]);
  const closedSupportStatuses = new Set(["resolved", "closed"]);

  return {
    bookingVolumeByType,
    metrics: {
      activeUsersNow: profiles.filter((profile) => {
        if (!profile.last_signed_in_at) {
          return false;
        }

        return new Date(profile.last_signed_in_at).getTime() >= activeUserWindowTimestamp;
      }).length,
      bookingsThisMonth: bookingTimestamps.filter((entry) => entry.timestamp >= monthTimestamp)
        .length,
      bookingsThisWeek: bookingTimestamps.filter((entry) => entry.timestamp >= weekTimestamp)
        .length,
      bookingsToday: bookingTimestamps.filter((entry) => entry.timestamp >= todayTimestamp).length,
      pendingSupportTickets: supportTickets.filter(
        (ticket) => !closedSupportStatuses.has(ticket.status)
      ).length,
      pendingVisaApplications: visaApplications.filter((application) =>
        pendingVisaStatuses.has(application.status)
      ).length,
      revenueThisMonthMinor: paymentTimestamps
        .filter((entry) => entry.timestamp >= monthTimestamp)
        .reduce((sum, entry) => sum + entry.payment.amount_captured_minor, 0),
      revenueThisWeekMinor: paymentTimestamps
        .filter((entry) => entry.timestamp >= weekTimestamp)
        .reduce((sum, entry) => sum + entry.payment.amount_captured_minor, 0),
      revenueTodayMinor: paymentTimestamps
        .filter((entry) => entry.timestamp >= todayTimestamp)
        .reduce((sum, entry) => sum + entry.payment.amount_captured_minor, 0)
    },
    recentBookings,
    revenueByDay,
    topRoutes
  };
}

async function resolveAdminBookingCustomerUserIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  customerFilter: string
) {
  const needle = customerFilter.trim();

  if (!needle) {
    return null;
  }

  const profileResult = await admin
    .from("profiles")
    .select("user_id")
    .is("deleted_at", null)
    .or(
      `email.ilike.%${needle}%,first_name.ilike.%${needle}%,last_name.ilike.%${needle}%,phone.ilike.%${needle}%`
    );

  const profiles = (profileResult.data as Array<{user_id: string}> | null) ?? [];

  return Array.from(new Set(profiles.map((profile) => profile.user_id).filter(Boolean)));
}

export async function listAdminBookings(filters: AdminBookingFilters): Promise<{
  items: AdminBookingListItem[];
  pagination: AdminPagination;
}> {
  const admin = createSupabaseAdminClient();
  const pageSize = 12;
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const customerUserIds = filters.customer
    ? await resolveAdminBookingCustomerUserIds(admin, filters.customer)
    : null;
  const dateFrom = normalizeFilterDateStart(filters.dateFrom);
  const dateTo = normalizeFilterDateEndExclusive(filters.dateTo);

  let bookingsQuery = admin
    .from("bookings")
    .select(
      "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, customer_email, customer_user_id",
      {count: "exact"}
    )
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.type) {
    bookingsQuery = bookingsQuery.eq("primary_booking_type", filters.type);
  }

  if (filters.status) {
    bookingsQuery = bookingsQuery.eq("status", filters.status);
  }

  if (filters.paymentStatus) {
    bookingsQuery = bookingsQuery.eq("payment_status", filters.paymentStatus);
  }

  if (filters.currency && isSupportedCurrency(filters.currency)) {
    bookingsQuery = bookingsQuery.eq("currency_code", filters.currency);
  }

  if (typeof filters.minTotalAmountMinor === "number") {
    bookingsQuery = bookingsQuery.gte("total_amount_minor", filters.minTotalAmountMinor);
  }

  if (typeof filters.maxTotalAmountMinor === "number") {
    bookingsQuery = bookingsQuery.lte("total_amount_minor", filters.maxTotalAmountMinor);
  }

  if (dateFrom) {
    bookingsQuery = bookingsQuery.gte("created_at", dateFrom);
  }

  if (dateTo) {
    bookingsQuery = bookingsQuery.lt("created_at", dateTo);
  }

  if (customerUserIds && customerUserIds.length === 0) {
    return {
      items: [],
      pagination: buildPagination(0, page, pageSize)
    };
  }

  if (customerUserIds && customerUserIds.length > 0) {
    bookingsQuery = bookingsQuery.in("customer_user_id", customerUserIds);
  }

  if (filters.query) {
    bookingsQuery = bookingsQuery.or(
      `booking_reference.ilike.%${filters.query}%,customer_email.ilike.%${filters.query}%`
    );
  }

  const bookingsResult = await bookingsQuery.range(from, to);
  const bookings =
    ((bookingsResult.data as Array<{
      booking_reference: string;
      created_at: string;
      currency_code: SupportedCurrency;
      customer_email: string;
      customer_user_id: string;
      id: string;
      payment_status: PaymentStatus;
      primary_booking_type: BookingType;
      status: BookingStatus;
      total_amount_minor: number;
    }> | null) ?? []);
  const userIds = Array.from(new Set(bookings.map((booking) => booking.customer_user_id)));

  const profileResult = userIds.length
    ? await admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, role, phone, created_at, updated_at")
        .in("user_id", userIds)
    : {data: []};
  const profileMap = buildProfileMap((profileResult.data as ProfileRow[] | null) ?? []);

  return {
    items: bookings.map((booking) => {
      const customer = profileMap.get(booking.customer_user_id);

      return {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        createdAt: booking.created_at,
        currency: booking.currency_code,
        customerEmail: booking.customer_email,
        customerName: customer?.name ?? booking.customer_email,
        customerUserId: booking.customer_user_id,
        paymentStatus: booking.payment_status,
        primaryBookingType: booking.primary_booking_type,
        status: booking.status,
        totalAmountMinor: booking.total_amount_minor
      };
    }),
    pagination: buildPagination(bookingsResult.count ?? 0, page, pageSize)
  };
}

export async function listAdminBookingsForExport(
  filters: Omit<AdminBookingFilters, "page">
): Promise<AdminBookingListItem[]> {
  const admin = createSupabaseAdminClient();
  const customerUserIds = filters.customer
    ? await resolveAdminBookingCustomerUserIds(admin, filters.customer)
    : null;
  const dateFrom = normalizeFilterDateStart(filters.dateFrom);
  const dateTo = normalizeFilterDateEndExclusive(filters.dateTo);

  let bookingsQuery = admin
    .from("bookings")
    .select(
      "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, customer_email, customer_user_id"
    )
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.type) {
    bookingsQuery = bookingsQuery.eq("primary_booking_type", filters.type);
  }

  if (filters.status) {
    bookingsQuery = bookingsQuery.eq("status", filters.status);
  }

  if (filters.paymentStatus) {
    bookingsQuery = bookingsQuery.eq("payment_status", filters.paymentStatus);
  }

  if (filters.currency && isSupportedCurrency(filters.currency)) {
    bookingsQuery = bookingsQuery.eq("currency_code", filters.currency);
  }

  if (typeof filters.minTotalAmountMinor === "number") {
    bookingsQuery = bookingsQuery.gte("total_amount_minor", filters.minTotalAmountMinor);
  }

  if (typeof filters.maxTotalAmountMinor === "number") {
    bookingsQuery = bookingsQuery.lte("total_amount_minor", filters.maxTotalAmountMinor);
  }

  if (dateFrom) {
    bookingsQuery = bookingsQuery.gte("created_at", dateFrom);
  }

  if (dateTo) {
    bookingsQuery = bookingsQuery.lt("created_at", dateTo);
  }

  if (customerUserIds && customerUserIds.length === 0) {
    return [];
  }

  if (customerUserIds && customerUserIds.length > 0) {
    bookingsQuery = bookingsQuery.in("customer_user_id", customerUserIds);
  }

  if (filters.query) {
    bookingsQuery = bookingsQuery.or(
      `booking_reference.ilike.%${filters.query}%,customer_email.ilike.%${filters.query}%`
    );
  }

  const bookingsResult = await bookingsQuery;
  const bookings =
    ((bookingsResult.data as Array<{
      booking_reference: string;
      created_at: string;
      currency_code: SupportedCurrency;
      customer_email: string;
      customer_user_id: string;
      id: string;
      payment_status: PaymentStatus;
      primary_booking_type: BookingType;
      status: BookingStatus;
      total_amount_minor: number;
    }> | null) ?? []);
  const userIds = Array.from(new Set(bookings.map((booking) => booking.customer_user_id)));

  const profileResult = userIds.length
    ? await admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, role, phone, created_at, updated_at")
        .in("user_id", userIds)
    : {data: []};
  const profileMap = buildProfileMap((profileResult.data as ProfileRow[] | null) ?? []);

  return bookings.map((booking) => {
    const customer = profileMap.get(booking.customer_user_id);

    return {
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      createdAt: booking.created_at,
      currency: booking.currency_code,
      customerEmail: booking.customer_email,
      customerName: customer?.name ?? booking.customer_email,
      customerUserId: booking.customer_user_id,
      paymentStatus: booking.payment_status,
      primaryBookingType: booking.primary_booking_type,
      status: booking.status,
      totalAmountMinor: booking.total_amount_minor
    };
  });
}

export async function getAdminBookingDetail(bookingId: string): Promise<AdminBookingDetail | null> {
  const admin = createSupabaseAdminClient();
  const bookingResult = await admin
    .from("bookings")
    .select(
      "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, confirmed_at, customer_email, customer_phone, subtotal_amount_minor, tax_amount_minor, discount_amount_minor, billing_address_snapshot, metadata, customer_user_id, created_by_user_id, deleted_at"
    )
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();
  const booking = (bookingResult.data as BookingRow | null) ?? null;

  if (!booking) {
    return null;
  }

  const [
    itemsResult,
    travelersResult,
    invoiceResult,
    paymentResult,
    refundsResult,
    profilesResult,
    notesResult,
    auditResult,
    supportResult
  ] = await Promise.all([
    admin
      .from("booking_items")
      .select(
        "id, booking_id, position, booking_type, title, description, service_start_at, service_end_at, quantity, subtotal_amount_minor, tax_amount_minor, total_amount_minor, currency_code, supplier_confirmation_reference, snapshot_payload, status"
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
        "id, booking_id, invoice_number, status, currency_code, subtotal_amount_minor, tax_amount_minor, total_amount_minor, created_at"
      )
      .eq("booking_id", booking.id)
      .order("created_at", {ascending: false})
      .limit(1)
      .maybeSingle(),
    admin
      .from("payments")
      .select(
        "id, booking_id, status, amount_captured_minor, amount_refunded_minor, currency_code, provider_payment_reference, created_at, paid_at"
      )
      .eq("booking_id", booking.id)
      .order("created_at", {ascending: false})
      .limit(1)
      .maybeSingle(),
    admin
      .from("refunds")
      .select("id, booking_id, amount_minor, currency_code, status, reason, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", {ascending: false}),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at")
      .in(
        "user_id",
        [booking.customer_user_id, booking.created_by_user_id].filter(
          (value): value is string => Boolean(value)
        )
      ),
    admin
      .from("admin_notes")
      .select("id, author_user_id, title, note_body, is_visible_to_customer, created_at")
      .eq("entity_type", "booking")
      .eq("entity_id", booking.id)
      .is("deleted_at", null)
      .order("created_at", {ascending: false}),
    admin
      .from("audit_logs")
      .select("id, actor_user_id, action, entity_type, created_at")
      .eq("entity_type", "booking")
      .eq("entity_id", booking.id)
      .order("created_at", {ascending: false})
      .limit(10),
    admin
      .from("support_tickets")
      .select(
        "id, ticket_number, subject, priority, status, owner_user_id, assigned_admin_user_id, booking_id, created_at, description"
      )
      .eq("booking_id", booking.id)
      .is("deleted_at", null)
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

  const profiles = (profilesResult.data as ProfileRow[] | null) ?? [];
  const profileMap = buildProfileMap(profiles);
  const customer = profileMap.get(booking.customer_user_id);
  const noteAuthors = Array.from(
    new Set(
      (((notesResult.data as AdminNoteRow[] | null) ?? []).map((note) => note.author_user_id) ?? []).filter(
        Boolean
      )
    )
  );
  const auditActors = Array.from(
    new Set(
      (((auditResult.data as AuditRow[] | null) ?? []).map((row) => row.actor_user_id) ?? []).filter(
        (value): value is string => Boolean(value)
      )
    )
  );
  const missingProfileIds = Array.from(
    new Set(
      [...noteAuthors, ...auditActors].filter((userId) => !profileMap.has(userId))
    )
  );

  if (missingProfileIds.length > 0) {
    const extraProfiles = await admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at")
      .in("user_id", missingProfileIds);

    for (const profile of (extraProfiles.data as ProfileRow[] | null) ?? []) {
      profileMap.set(profile.user_id, {
        email: profile.email,
        name: buildPersonName(profile.first_name, profile.last_name, profile.email)
      });
    }
  }

  return {
    auditTrail: (((auditResult.data as AuditRow[] | null) ?? []).map((row) => ({
      action: row.action,
      actorLabel: row.actor_user_id
        ? profileMap.get(row.actor_user_id)?.name ?? row.actor_user_id
        : "System",
      createdAt: row.created_at,
      entityType: row.entity_type,
      id: row.id
    })) ?? []),
    billingAddress: asRecord(booking.billing_address_snapshot),
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    confirmedAt: booking.confirmed_at,
    createdAt: booking.created_at,
    createdByUserId: booking.created_by_user_id,
    currency: booking.currency_code,
    customerEmail: booking.customer_email,
    customerName: customer?.name ?? booking.customer_email,
    customerPhone: booking.customer_phone,
    customerUserId: booking.customer_user_id,
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
    notes: (((notesResult.data as AdminNoteRow[] | null) ?? []).map((note) => ({
      authorLabel: profileMap.get(note.author_user_id)?.name ?? note.author_user_id,
      createdAt: note.created_at,
      id: note.id,
      isVisibleToCustomer: note.is_visible_to_customer,
      noteBody: note.note_body,
      title: note.title
    })) ?? []),
    paymentAmountCapturedMinor: payment?.amount_captured_minor ?? 0,
    paymentAmountRefundedMinor: payment?.amount_refunded_minor ?? 0,
    paymentId: payment?.id ?? null,
    paymentProviderReference: payment?.provider_payment_reference ?? null,
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
    supportTickets: (((supportResult.data as SupportTicketRow[] | null) ?? []).map((ticket) => ({
      id: ticket.id,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      ticketNumber: ticket.ticket_number
    })) ?? []),
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
    })) ?? [])
  };
}

export async function listAdminCustomers(filters: AdminCustomerFilters): Promise<{
  items: AdminCustomerListItem[];
  pagination: AdminPagination;
}> {
  const admin = createSupabaseAdminClient();
  const pageSize = 12;
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let profileQuery = admin
    .from("profiles")
    .select(
      "user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended",
      {
      count: "exact"
      }
    )
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.role) {
    profileQuery = profileQuery.eq("role", filters.role);
  }

  if (filters.query) {
    profileQuery = profileQuery.or(
      `email.ilike.%${filters.query}%,first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`
    );
  }

  const profileResult = await profileQuery.range(from, to);
  const profiles = (profileResult.data as ProfileRow[] | null) ?? [];
  const userIds = profiles.map((profile) => profile.user_id);

  const [bookingsResult, visasResult, paymentsResult] = await Promise.all([
    userIds.length
      ? admin
          .from("bookings")
          .select("id, customer_user_id")
          .in("customer_user_id", userIds)
          .is("deleted_at", null)
      : {data: []},
    userIds.length
      ? admin
          .from("visa_applications")
          .select("id, applicant_user_id")
          .in("applicant_user_id", userIds)
          .is("deleted_at", null)
      : {data: []},
    userIds.length
      ? admin
          .from("payments")
          .select("user_id, amount_captured_minor, currency_code")
          .in("user_id", userIds)
          .gt("amount_captured_minor", 0)
      : {data: []}
  ]);

  const bookingCounts = new Map<string, number>();
  const visaCounts = new Map<string, number>();
  const spendSummaryMap = new Map<string, PaymentSummaryRow[]>();

  for (const row of ((bookingsResult.data as Array<{customer_user_id: string; id: string}> | null) ?? [])) {
    bookingCounts.set(row.customer_user_id, (bookingCounts.get(row.customer_user_id) ?? 0) + 1);
  }

  for (const row of ((visasResult.data as Array<{applicant_user_id: string; id: string}> | null) ?? [])) {
    visaCounts.set(row.applicant_user_id, (visaCounts.get(row.applicant_user_id) ?? 0) + 1);
  }

  for (const row of ((paymentsResult.data as PaymentSummaryRow[] | null) ?? [])) {
    const existing = spendSummaryMap.get(row.user_id) ?? [];
    existing.push(row);
    spendSummaryMap.set(row.user_id, existing);
  }

  return {
    items: profiles.map((profile) => ({
      bookingCount: bookingCounts.get(profile.user_id) ?? 0,
      createdAt: profile.created_at,
      email: profile.email,
      firstName: profile.first_name,
      isSuspended: profile.is_suspended,
      lastName: profile.last_name,
      lastSignedInAt: profile.last_signed_in_at,
      phone: profile.phone,
      role: profile.role,
      spendSummary: buildSpendSummary(spendSummaryMap.get(profile.user_id) ?? []),
      updatedAt: profile.updated_at,
      userId: profile.user_id,
      visaApplicationCount: visaCounts.get(profile.user_id) ?? 0
    })),
    pagination: buildPagination(profileResult.count ?? 0, page, pageSize)
  };
}

export async function getAdminCustomerDetail(userId: string) {
  const admin = createSupabaseAdminClient();
  const [profileResult, bookingsResult, visasResult, paymentsResult, notesResult] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("bookings")
      .select(
        "id, booking_reference, primary_booking_type, status, payment_status, currency_code, total_amount_minor, created_at, customer_user_id"
      )
      .eq("customer_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", {ascending: false}),
    admin
      .from("visa_applications")
      .select("id")
      .eq("applicant_user_id", userId)
      .is("deleted_at", null),
    admin
      .from("payments")
      .select("user_id, amount_captured_minor, currency_code")
      .eq("user_id", userId)
      .gt("amount_captured_minor", 0),
    admin
      .from("admin_notes")
      .select("id, author_user_id, title, note_body, is_visible_to_customer, created_at")
      .eq("entity_type", "customer")
      .eq("entity_id", userId)
      .is("deleted_at", null)
      .order("created_at", {ascending: false})
  ]);

  const profile = (profileResult.data as ProfileRow | null) ?? null;

  if (!profile) {
    return null;
  }

  const notes = (notesResult.data as AdminNoteRow[] | null) ?? [];
  const authorIds = Array.from(new Set(notes.map((note) => note.author_user_id)));
  const authorProfilesResult = authorIds.length
    ? await admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended")
        .in("user_id", authorIds)
    : {data: []};
  const authorMap = buildProfileMap((authorProfilesResult.data as ProfileRow[] | null) ?? []);
  const bookingRows =
    ((bookingsResult.data as Array<{
      booking_reference: string;
      created_at: string;
      currency_code: SupportedCurrency;
      id: string;
      payment_status: PaymentStatus;
      primary_booking_type: BookingType;
      status: BookingStatus;
      total_amount_minor: number;
    }> | null) ?? []);

  return {
    bookingCount: bookingRows.length,
    bookings: bookingRows.map((booking) => ({
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      createdAt: booking.created_at,
      currency: booking.currency_code,
      paymentStatus: booking.payment_status,
      primaryBookingType: booking.primary_booking_type,
      status: booking.status,
      totalAmountMinor: booking.total_amount_minor
    })),
    createdAt: profile.created_at,
    email: profile.email,
    firstName: profile.first_name,
    isSuspended: profile.is_suspended,
    lastLoginAt: profile.last_signed_in_at,
    lastName: profile.last_name,
    notes: notes.map((note) => ({
      authorLabel: authorMap.get(note.author_user_id)?.name ?? note.author_user_id,
      createdAt: note.created_at,
      id: note.id,
      isVisibleToCustomer: note.is_visible_to_customer,
      noteBody: note.note_body,
      title: note.title
    })),
    phone: profile.phone,
    role: profile.role,
    spendSummary: buildSpendSummary((paymentsResult.data as PaymentSummaryRow[] | null) ?? []),
    userId: profile.user_id,
    visaApplicationCount: ((visasResult.data as Array<{id: string}> | null) ?? []).length
  };
}

export async function listAdminCustomersForExport(filters: Omit<AdminCustomerFilters, "page">) {
  const admin = createSupabaseAdminClient();

  let profileQuery = admin
    .from("profiles")
    .select(
      "user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended"
    )
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.role) {
    profileQuery = profileQuery.eq("role", filters.role);
  }

  if (filters.query) {
    profileQuery = profileQuery.or(
      `email.ilike.%${filters.query}%,first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`
    );
  }

  const profileResult = await profileQuery;
  const profiles = (profileResult.data as ProfileRow[] | null) ?? [];
  const userIds = profiles.map((profile) => profile.user_id);

  const [bookingsResult, visasResult, paymentsResult] = await Promise.all([
    userIds.length
      ? admin
          .from("bookings")
          .select("id, customer_user_id")
          .in("customer_user_id", userIds)
          .is("deleted_at", null)
      : {data: []},
    userIds.length
      ? admin
          .from("visa_applications")
          .select("id, applicant_user_id")
          .in("applicant_user_id", userIds)
          .is("deleted_at", null)
      : {data: []},
    userIds.length
      ? admin
          .from("payments")
          .select("user_id, amount_captured_minor, currency_code")
          .in("user_id", userIds)
          .gt("amount_captured_minor", 0)
      : {data: []}
  ]);

  const bookingCounts = new Map<string, number>();
  const visaCounts = new Map<string, number>();
  const spendSummaryMap = new Map<string, PaymentSummaryRow[]>();

  for (const row of ((bookingsResult.data as Array<{customer_user_id: string; id: string}> | null) ?? [])) {
    bookingCounts.set(row.customer_user_id, (bookingCounts.get(row.customer_user_id) ?? 0) + 1);
  }

  for (const row of ((visasResult.data as Array<{applicant_user_id: string; id: string}> | null) ?? [])) {
    visaCounts.set(row.applicant_user_id, (visaCounts.get(row.applicant_user_id) ?? 0) + 1);
  }

  for (const row of ((paymentsResult.data as PaymentSummaryRow[] | null) ?? [])) {
    const existing = spendSummaryMap.get(row.user_id) ?? [];
    existing.push(row);
    spendSummaryMap.set(row.user_id, existing);
  }

  return profiles.map((profile) => ({
    bookingCount: bookingCounts.get(profile.user_id) ?? 0,
    createdAt: profile.created_at,
    email: profile.email,
    firstName: profile.first_name,
    isSuspended: profile.is_suspended,
    lastName: profile.last_name,
    lastSignedInAt: profile.last_signed_in_at,
    phone: profile.phone,
    role: profile.role,
    spendSummary: buildSpendSummary(spendSummaryMap.get(profile.user_id) ?? []),
    updatedAt: profile.updated_at,
    userId: profile.user_id,
    visaApplicationCount: visaCounts.get(profile.user_id) ?? 0
  }));
}

export async function listAdminVisaQueue(filters: AdminVisaQueueFilters): Promise<{
  items: AdminVisaQueueItem[];
  pagination: AdminPagination;
}> {
  const admin = createSupabaseAdminClient();
  const pageSize = 12;
  const page = Math.max(filters.page, 1);
  const dateFrom = normalizeFilterDateStart(filters.dateFrom);
  const dateTo = normalizeFilterDateEndExclusive(filters.dateTo);

  let query = admin
    .from("visa_applications")
    .select(
      "id, applicant_user_id, visa_country_code, application_reference, status, submitted_at, reviewed_at, created_at, updated_at, form_data",
      {count: "exact"}
    )
    .is("deleted_at", null)
    .order("updated_at", {ascending: false});

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.countryCode) {
    query = query.eq("visa_country_code", filters.countryCode);
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lt("created_at", dateTo);
  }

  const visaResult = await query;
  const applications = (visaResult.data as VisaApplicationRow[] | null) ?? [];
  const userIds = Array.from(new Set(applications.map((application) => application.applicant_user_id)));
  const applicationIds = applications.map((application) => application.id);

  const [profileResult, uploadResult] = await Promise.all([
    userIds.length
      ? admin
          .from("profiles")
          .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at")
          .in("user_id", userIds)
      : {data: []},
    applicationIds.length
      ? admin
          .from("uploads")
          .select("id, linked_entity_id, file_name, mime_type, byte_size, created_at")
          .eq("linked_entity_type", "visa_application")
          .in("linked_entity_id", applicationIds)
          .is("deleted_at", null)
      : {data: []}
  ]);

  const profileMap = buildProfileMap((profileResult.data as ProfileRow[] | null) ?? []);
  const uploadCountMap = new Map<string, number>();

  for (const upload of (uploadResult.data as UploadRow[] | null) ?? []) {
    if (upload.linked_entity_id) {
      uploadCountMap.set(upload.linked_entity_id, (uploadCountMap.get(upload.linked_entity_id) ?? 0) + 1);
    }
  }

  let filteredApplications = applications;

  if (filters.query) {
    const needle = filters.query.toLowerCase();
    filteredApplications = applications.filter((application) => {
      const profile = profileMap.get(application.applicant_user_id);
      return (
        application.application_reference?.toLowerCase().includes(needle) ||
        profile?.email.toLowerCase().includes(needle) ||
        profile?.name.toLowerCase().includes(needle)
      );
    });
  }

  return {
    items: filteredApplications.slice((page - 1) * pageSize, page * pageSize).map((application) => {
      const profile = profileMap.get(application.applicant_user_id);

      return {
        applicationId: application.id,
        applicationReference: application.application_reference,
        countryCode: application.visa_country_code,
        createdAt: application.created_at,
        customerEmail: profile?.email ?? "",
        customerName: profile?.name ?? profile?.email ?? application.applicant_user_id,
        reviewedAt: application.reviewed_at,
        status: application.status,
        submittedAt: application.submitted_at,
        uploadCount: uploadCountMap.get(application.id) ?? 0
      };
    }),
    pagination: buildPagination(filteredApplications.length, page, pageSize)
  };
}

export async function getAdminVisaApplicationDetail(
  applicationId: string
): Promise<AdminVisaApplicationDetail | null> {
  const admin = createSupabaseAdminClient();
  const applicationResult = await admin
    .from("visa_applications")
    .select(
      "id, applicant_user_id, visa_country_code, application_reference, status, submitted_at, reviewed_at, created_at, updated_at, form_data"
    )
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  const application =
    (applicationResult.data as (VisaApplicationRow & {applicant_user_id: string}) | null) ?? null;

  if (!application) {
    return null;
  }

  const [profileResult, uploadsResult, notesResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended")
      .eq("user_id", application.applicant_user_id)
      .maybeSingle(),
    admin
      .from("uploads")
      .select(
        "id, linked_entity_id, file_name, mime_type, byte_size, document_category, created_at, metadata"
      )
      .eq("owner_user_id", application.applicant_user_id)
      .eq("linked_entity_type", "visa_application")
      .eq("linked_entity_id", application.id)
      .is("deleted_at", null)
      .order("created_at", {ascending: true}),
    admin
      .from("admin_notes")
      .select("id, author_user_id, title, note_body, is_visible_to_customer, created_at")
      .eq("entity_type", "visa_application")
      .eq("entity_id", application.id)
      .is("deleted_at", null)
      .order("created_at", {ascending: false})
  ]);

  const profile = (profileResult.data as ProfileRow | null) ?? null;
  const notes = (notesResult.data as AdminNoteRow[] | null) ?? [];
  const noteAuthorIds = Array.from(new Set(notes.map((note) => note.author_user_id)));
  const noteAuthorsResult = noteAuthorIds.length
    ? await admin
        .from("profiles")
        .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended")
        .in("user_id", noteAuthorIds)
    : {data: []};
  const noteAuthorMap = buildProfileMap((noteAuthorsResult.data as ProfileRow[] | null) ?? []);
  const uploads = ((uploadsResult.data as UploadRow[] | null) ?? []).map((upload) => {
    const metadata = asRecord(upload.metadata);

    return {
      accessPath: `/api/visa/uploads/${upload.id}/access`,
      byteSize: upload.byte_size,
      createdAt: upload.created_at,
      documentType: String(metadata.documentType ?? "travel_itinerary"),
      fileName: upload.file_name,
      id: upload.id,
      mimeType: upload.mime_type
    };
  });

  return {
    applicationId: application.id,
    applicationReference: application.application_reference,
    countryCode: application.visa_country_code,
    createdAt: application.created_at,
    customerEmail: profile?.email ?? "",
    customerName: buildPersonName(profile?.first_name ?? null, profile?.last_name ?? null, profile?.email ?? application.applicant_user_id),
    formData: asRecord(application.form_data),
    notes: notes.map((note) => ({
      authorLabel: noteAuthorMap.get(note.author_user_id)?.name ?? note.author_user_id,
      createdAt: note.created_at,
      id: note.id,
      isVisibleToCustomer: note.is_visible_to_customer,
      noteBody: note.note_body,
      title: note.title
    })),
    reviewedAt: application.reviewed_at,
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    uploads
  };
}

export async function getAdminSupportTicketDetail(
  ticketId: string
): Promise<AdminSupportTicketDetail | null> {
  const admin = createSupabaseAdminClient();
  const ticketResult = await admin
    .from("support_tickets")
    .select(
      "id, ticket_number, owner_user_id, assigned_admin_user_id, booking_id, subject, description, priority, status, created_at"
    )
    .eq("id", ticketId)
    .is("deleted_at", null)
    .maybeSingle();
  const ticket = (ticketResult.data as SupportTicketRow | null) ?? null;

  if (!ticket) {
    return null;
  }

  const [profileResult, bookingResult, messagesResult, notesResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended")
      .in(
        "user_id",
        [ticket.owner_user_id, ticket.assigned_admin_user_id].filter(
          (value): value is string => Boolean(value)
        )
      ),
    ticket.booking_id
      ? admin.from("bookings").select("id, booking_reference").eq("id", ticket.booking_id).maybeSingle()
      : Promise.resolve({data: null}),
    admin
      .from("support_ticket_messages")
      .select("id, ticket_id, author_user_id, visibility, delivery_channel, message_body, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", {ascending: true}),
    admin
      .from("admin_notes")
      .select("id, author_user_id, title, note_body, is_visible_to_customer, created_at")
      .eq("entity_type", "support_ticket")
      .eq("entity_id", ticket.id)
      .is("deleted_at", null)
      .order("created_at", {ascending: false})
  ]);

  const profiles = (profileResult.data as ProfileRow[] | null) ?? [];
  const profileMap = buildProfileMap(profiles);
  const messageAuthors = Array.from(
    new Set(
      (((messagesResult.data as SupportMessageRow[] | null) ?? []).map((message) => message.author_user_id) ?? []).filter(
        (value): value is string => Boolean(value)
      )
    )
  );
  const noteAuthors = Array.from(
    new Set(
      (((notesResult.data as AdminNoteRow[] | null) ?? []).map((note) => note.author_user_id) ?? []).filter(
        Boolean
      )
    )
  );
  const missingProfileIds = Array.from(
    new Set(
      [...messageAuthors, ...noteAuthors].filter((userId) => !profileMap.has(userId))
    )
  );

  if (missingProfileIds.length > 0) {
    const extraProfiles = await admin
      .from("profiles")
      .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at, last_signed_in_at, is_suspended")
      .in("user_id", missingProfileIds);

    for (const profile of (extraProfiles.data as ProfileRow[] | null) ?? []) {
      profileMap.set(profile.user_id, {
        email: profile.email,
        name: buildPersonName(profile.first_name, profile.last_name, profile.email)
      });
    }
  }

  const customer = profileMap.get(ticket.owner_user_id);
  const syntheticOpeningMessage = {
    authorLabel: customer?.name ?? customer?.email ?? "Customer",
    createdAt: ticket.created_at,
    deliveryChannel: "portal",
    id: `ticket-opening-${ticket.id}`,
    messageBody: ticket.description,
    visibility: "customer" as const
  };

  return {
    assignedAdminLabel: ticket.assigned_admin_user_id
      ? profileMap.get(ticket.assigned_admin_user_id)?.name ?? ticket.assigned_admin_user_id
      : null,
    assignedAdminUserId: ticket.assigned_admin_user_id,
    bookingId: ticket.booking_id,
    bookingReference:
      ((bookingResult.data as {booking_reference?: string; id: string} | null) ?? null)
        ?.booking_reference ?? null,
    createdAt: ticket.created_at,
    customerEmail: customer?.email ?? "",
    customerName: customer?.name ?? customer?.email ?? ticket.owner_user_id,
    description: ticket.description,
    id: ticket.id,
    messages: [
      syntheticOpeningMessage,
      ...(((messagesResult.data as SupportMessageRow[] | null) ?? []).map((message) => ({
        authorLabel: message.author_user_id
          ? profileMap.get(message.author_user_id)?.name ?? message.author_user_id
          : "System",
        createdAt: message.created_at,
        deliveryChannel: message.delivery_channel,
        id: message.id,
        messageBody: message.message_body,
        visibility: message.visibility
      })) ?? [])
    ],
    notes: (((notesResult.data as AdminNoteRow[] | null) ?? []).map((note) => ({
      authorLabel: profileMap.get(note.author_user_id)?.name ?? note.author_user_id,
      createdAt: note.created_at,
      id: note.id,
      isVisibleToCustomer: note.is_visible_to_customer,
      noteBody: note.note_body,
      title: note.title
    })) ?? []),
    ownerUserId: ticket.owner_user_id,
    priority: ticket.priority,
    status: ticket.status,
    subject: ticket.subject,
    ticketNumber: ticket.ticket_number
  };
}

export async function listAdminSupportTickets(filters: AdminSupportFilters): Promise<{
  items: AdminSupportTicketItem[];
  pagination: AdminPagination;
}> {
  const admin = createSupabaseAdminClient();
  const pageSize = 12;
  const page = Math.max(filters.page, 1);
  const dateFrom = normalizeFilterDateStart(filters.dateFrom);
  const dateTo = normalizeFilterDateEndExclusive(filters.dateTo);

  let query = admin
    .from("support_tickets")
    .select(
      "id, ticket_number, owner_user_id, assigned_admin_user_id, booking_id, subject, description, priority, status, created_at",
      {count: "exact"}
    )
    .is("deleted_at", null)
    .order("created_at", {ascending: false});

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.assignedAdminUserId) {
    query = query.eq("assigned_admin_user_id", filters.assignedAdminUserId);
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lt("created_at", dateTo);
  }

  const ticketResult = await query;
  const tickets = (ticketResult.data as SupportTicketRow[] | null) ?? [];
  const ownerIds = Array.from(new Set(tickets.map((ticket) => ticket.owner_user_id)));
  const adminIds = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.assigned_admin_user_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const bookingIds = Array.from(
    new Set(
      tickets.map((ticket) => ticket.booking_id).filter((value): value is string => Boolean(value))
    )
  );

  const [profileResult, bookingResult] = await Promise.all([
    [...ownerIds, ...adminIds].length
      ? admin
          .from("profiles")
          .select("user_id, email, first_name, last_name, phone, role, created_at, updated_at")
          .in("user_id", Array.from(new Set([...ownerIds, ...adminIds])))
      : {data: []},
    bookingIds.length
      ? admin
          .from("bookings")
          .select("id, booking_reference")
          .in("id", bookingIds)
      : {data: []}
  ]);

  const profileMap = buildProfileMap((profileResult.data as ProfileRow[] | null) ?? []);
  const bookingMap = new Map(
    (((bookingResult.data as Array<{booking_reference: string; id: string}> | null) ?? []).map(
      (booking) => [booking.id, booking.booking_reference]
    ) as Array<[string, string]>)
  );

  let filteredTickets = tickets;

  if (filters.query) {
    const needle = filters.query.toLowerCase();
    filteredTickets = tickets.filter((ticket) => {
      const customer = profileMap.get(ticket.owner_user_id);
      return (
        ticket.ticket_number.toLowerCase().includes(needle) ||
        ticket.subject.toLowerCase().includes(needle) ||
        customer?.email.toLowerCase().includes(needle) ||
        customer?.name.toLowerCase().includes(needle)
      );
    });
  }

  return {
    items: filteredTickets.slice((page - 1) * pageSize, page * pageSize).map((ticket) => ({
      assignedAdminLabel: ticket.assigned_admin_user_id
        ? profileMap.get(ticket.assigned_admin_user_id)?.name ?? ticket.assigned_admin_user_id
        : null,
      assignedAdminUserId: ticket.assigned_admin_user_id,
      bookingReference: ticket.booking_id ? bookingMap.get(ticket.booking_id) ?? null : null,
      createdAt: ticket.created_at,
      customerEmail: profileMap.get(ticket.owner_user_id)?.email ?? "",
      customerName:
        profileMap.get(ticket.owner_user_id)?.name ?? profileMap.get(ticket.owner_user_id)?.email ?? "",
      description: ticket.description,
      id: ticket.id,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      ticketNumber: ticket.ticket_number
    })),
    pagination: buildPagination(filteredTickets.length, page, pageSize)
  };
}

export async function listAdminResourceRecords(resource: Exclude<AdminResourceKey, "customers">) {
  const admin = createSupabaseAdminClient();
  const definition = ADMIN_RESOURCE_QUERIES[resource];
  let query = admin.from(definition.table).select(definition.select).order(definition.orderBy.column, {
    ascending: definition.orderBy.ascending ?? true
  });

  if (definition.softDeleteColumn) {
    query = query.is(definition.softDeleteColumn, null);
  }

  const result = await query;
  return ((result.data as Record<string, unknown>[] | null) ?? []);
}
