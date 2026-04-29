import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {
  BOOKING_TYPES,
  CURRENCY_CODES,
  DATA_REQUEST_STATUSES,
  DATA_REQUEST_TYPES,
  PAYMENT_STATUSES,
  USER_ROLES,
  VISA_APPLICATION_STATUSES
} from "@/types/database-enums";
import {ADMIN_RESOURCE_KEYS, type AdminResourceKey} from "@/features/admin/types";
import {type Json} from "@/types/supabase";

const nullableTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const requiredTrimmedString = z.string().trim().min(1);

const optionalInteger = z
  .union([z.number().int(), z.null()])
  .optional()
  .transform((value) => value ?? null);

const optionalPositiveInteger = z
  .union([z.number().int().positive(), z.null()])
  .optional()
  .transform((value) => value ?? null);

const optionalFloat = z
  .union([z.number(), z.null()])
  .optional()
  .transform((value) => value ?? null);

function toJsonValue(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }

  if (typeof value === "object") {
    const record: Record<string, Json | undefined> = {};

    for (const [key, entry] of Object.entries(value)) {
      record[key] = toJsonValue(entry);
    }

    return record;
  }

  throw new Error("JSON fields must contain serializable values.");
}

const jsonSchema = z.unknown().transform((value, context) => {
  try {
    return toJsonValue(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid JSON value."
    });

    return z.NEVER;
  }
});

const bookingTypeArraySchema = z.array(z.enum(BOOKING_TYPES)).default([]);
const localeSchema = z.enum(locales);
const currencyCodeSchema = z.enum(CURRENCY_CODES);

const customerSchema = z.object({
  first_name: nullableTrimmedString,
  last_name: nullableTrimmedString,
  phone: nullableTrimmedString,
  role: z.enum(USER_ROLES)
});

const destinationSchema = z.object({
  airport_id: nullableTrimmedString,
  city_id: nullableTrimmedString,
  country_code: requiredTrimmedString,
  destination_type: z.enum(["airport", "city", "country", "region"]),
  hero_image_url: nullableTrimmedString,
  is_featured: z.boolean().default(false),
  slug: requiredTrimmedString,
  sort_order: z.number().int().default(0),
  summary: nullableTrimmedString,
  tags: z.array(z.string().trim().min(1)).default([]),
  theme_color: nullableTrimmedString,
  title: requiredTrimmedString
});

const airportSchema = z.object({
  city_id: requiredTrimmedString,
  country_code: requiredTrimmedString,
  iata_code: requiredTrimmedString.transform((value) => value.toUpperCase()),
  icao_code: nullableTrimmedString.transform((value) => value?.toUpperCase() ?? null),
  is_active: z.boolean().default(true),
  latitude: optionalFloat,
  longitude: optionalFloat,
  name: requiredTrimmedString,
  time_zone: requiredTrimmedString
});

const airlineSchema = z.object({
  country_code: nullableTrimmedString,
  iata_code: nullableTrimmedString.transform((value) => value?.toUpperCase() ?? null),
  icao_code: nullableTrimmedString.transform((value) => value?.toUpperCase() ?? null),
  is_active: z.boolean().default(true),
  name: requiredTrimmedString
});

const featuredContentSchema = z.object({
  badge: nullableTrimmedString,
  body_markdown: nullableTrimmedString,
  content_key: requiredTrimmedString,
  cta_href: nullableTrimmedString,
  cta_label: nullableTrimmedString,
  destination_id: nullableTrimmedString,
  image_url: nullableTrimmedString,
  is_published: z.boolean().default(false),
  locale: localeSchema,
  publish_ends_at: nullableTrimmedString,
  publish_starts_at: nullableTrimmedString,
  sort_order: z.number().int().default(0),
  summary: nullableTrimmedString,
  title: requiredTrimmedString
});

const legalDocumentSchema = z.object({
  body_markdown: requiredTrimmedString,
  checksum_sha256: nullableTrimmedString,
  document_key: z.enum([
    "cookie_policy",
    "privacy_policy",
    "refund_policy",
    "terms_of_use"
  ]),
  effective_at: requiredTrimmedString,
  is_current: z.boolean().default(false),
  locale: localeSchema,
  publication_status: z.enum(["archived", "draft", "published"]),
  published_at: nullableTrimmedString,
  summary: nullableTrimmedString,
  title: requiredTrimmedString,
  version: requiredTrimmedString
});

const visaProductSchema = z.object({
  content_markdown: nullableTrimmedString,
  country_code: requiredTrimmedString,
  currency_code: currencyCodeSchema,
  is_published: z.boolean().default(false),
  locale: localeSchema,
  metadata: jsonSchema.default({}),
  price_from_minor: z.number().int().nonnegative(),
  processing_days_max: optionalPositiveInteger,
  processing_days_min: optionalPositiveInteger,
  processing_timeline_summary: nullableTrimmedString,
  requirement_summary: nullableTrimmedString,
  requirements: jsonSchema.default([]),
  service_code: requiredTrimmedString,
  slug: requiredTrimmedString,
  sort_order: z.number().int().default(0),
  summary: nullableTrimmedString,
  supports_dependents: z.boolean().default(false),
  title: requiredTrimmedString
});

const supplierSchema = z.object({
  base_url: nullableTrimmedString,
  code: requiredTrimmedString.transform((value) => value.toUpperCase()),
  configuration: jsonSchema.default({}),
  contact_email: nullableTrimmedString,
  is_active: z.boolean().default(true),
  name: requiredTrimmedString,
  service_types: bookingTypeArraySchema
});

const couponSchema = z
  .object({
    amount_minor: optionalInteger,
    applicable_booking_types: bookingTypeArraySchema,
    code: requiredTrimmedString.transform((value) => value.toUpperCase()),
    currency_code: z.union([currencyCodeSchema, z.null()]).optional().transform((value) => value ?? null),
    description: nullableTrimmedString,
    discount_type: z.enum(["fixed_amount", "percentage"]),
    ends_at: nullableTrimmedString,
    is_active: z.boolean().default(true),
    minimum_booking_value_minor: optionalInteger,
    max_redemptions: optionalPositiveInteger,
    metadata: jsonSchema.default({}),
    percentage_bps: optionalPositiveInteger,
    starts_at: nullableTrimmedString
  })
  .superRefine((value, context) => {
    if (value.discount_type === "fixed_amount") {
      if (value.amount_minor === null) {
        context.addIssue({
          code: "custom",
          message: "Fixed-amount coupons require an amount.",
          path: ["amount_minor"]
        });
      }

      if (!value.currency_code) {
        context.addIssue({
          code: "custom",
          message: "Fixed-amount coupons require a currency.",
          path: ["currency_code"]
        });
      }
    }

    if (value.discount_type === "percentage" && value.percentage_bps === null) {
      context.addIssue({
        code: "custom",
        message: "Percentage coupons require basis points.",
        path: ["percentage_bps"]
      });
    }
  });

const siteSettingSchema = z.object({
  description: nullableTrimmedString,
  is_public: z.boolean().default(false),
  locale: z.union([localeSchema, z.null()]).optional().transform((value) => value ?? null),
  setting_key: requiredTrimmedString,
  setting_value: jsonSchema
});

const noteSchema = z.object({
  entityId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
  entityType: requiredTrimmedString,
  isVisibleToCustomer: z.boolean().default(false),
  noteBody: requiredTrimmedString,
  title: nullableTrimmedString
});

const visaReviewSchema = z.object({
  reviewedAt: nullableTrimmedString,
  status: z.enum(VISA_APPLICATION_STATUSES)
});

const supportTicketSchema = z.object({
  assignedAdminUserId: nullableTrimmedString,
  priority: z.enum(["high", "low", "normal", "urgent"]),
  status: z.enum(["closed", "in_progress", "open", "resolved", "waiting_on_customer"])
});

const adminBookingStatusSchema = z.object({
  status: z.enum([
    "draft",
    "pending",
    "pending_payment",
    "confirmed",
    "partially_confirmed",
    "cancelled",
    "expired"
  ])
});

const adminBookingRefundSchema = z.object({
  amountMajor: z.number().positive().nullable().optional().transform((value) => value ?? null),
  reason: nullableTrimmedString
});

const adminBookingEmailSchema = z.object({
  message: requiredTrimmedString,
  replyTo: z
    .union([z.string().email(), z.null()])
    .optional()
    .transform((value) => value ?? null),
  subject: requiredTrimmedString
});

const adminCustomerStateSchema = z.object({
  isSuspended: z.boolean()
});

const adminSupportReplySchema = z.object({
  messageBody: requiredTrimmedString,
  replyTo: z
    .union([z.string().email(), z.null()])
    .optional()
    .transform((value) => value ?? null)
});

const adminVisaBulkReviewSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1),
  status: z.enum(VISA_APPLICATION_STATUSES)
});

const adminVisaTemplateResponseSchema = z.object({
  customMessage: nullableTrimmedString,
  templateKey: z.enum(["approved", "needs_changes", "rejected", "submitted_update"])
});

export const adminDataRequestSchema = z.object({
  assignedAdminUserId: nullableTrimmedString,
  rejectedReason: nullableTrimmedString,
  requestType: z.enum(DATA_REQUEST_TYPES).optional(),
  responseSummary: nullableTrimmedString,
  status: z.enum(DATA_REQUEST_STATUSES)
});

const resourceSchemaMap = {
  customers: customerSchema,
  destinations: destinationSchema,
  airports: airportSchema,
  airlines: airlineSchema,
  "featured-content": featuredContentSchema,
  legal: legalDocumentSchema,
  "visa-products": visaProductSchema,
  suppliers: supplierSchema,
  coupons: couponSchema,
  settings: siteSettingSchema
} as const satisfies Record<AdminResourceKey, z.ZodType<Record<string, unknown>>>;

export function isAdminResourceKey(value: string): value is AdminResourceKey {
  return ADMIN_RESOURCE_KEYS.includes(value as AdminResourceKey);
}

export function parseAdminResourceInput(resource: AdminResourceKey, input: unknown) {
  return resourceSchemaMap[resource].parse(input);
}

export function parseAdminMutationBody(input: unknown) {
  return z
    .object({
      id: z.string().uuid().optional(),
      values: z.record(z.string(), z.unknown())
    })
    .parse(input);
}

export function parseAdminDeleteBody(input: unknown) {
  return z
    .object({
      id: z.string().uuid()
    })
    .parse(input);
}

export function parseAdminNoteInput(input: unknown) {
  return noteSchema.parse(input);
}

export function parseAdminVisaReviewInput(input: unknown) {
  return visaReviewSchema.parse(input);
}

export function parseAdminSupportTicketInput(input: unknown) {
  return supportTicketSchema.parse(input);
}

export function parseAdminDataRequestInput(input: unknown) {
  return adminDataRequestSchema.parse(input);
}

export function parseAdminBookingStatusInput(input: unknown) {
  return adminBookingStatusSchema.parse(input);
}

export function parseAdminBookingRefundInput(input: unknown) {
  return adminBookingRefundSchema.parse(input);
}

export function parseAdminBookingEmailInput(input: unknown) {
  return adminBookingEmailSchema.parse(input);
}

export function parseAdminCustomerStateInput(input: unknown) {
  return adminCustomerStateSchema.parse(input);
}

export function parseAdminSupportReplyInput(input: unknown) {
  return adminSupportReplySchema.parse(input);
}

export function parseAdminVisaBulkReviewInput(input: unknown) {
  return adminVisaBulkReviewSchema.parse(input);
}

export function parseAdminVisaTemplateResponseInput(input: unknown) {
  return adminVisaTemplateResponseSchema.parse(input);
}

export function parsePaymentStatusFilter(input: string | undefined) {
  if (!input) {
    return undefined;
  }

  return z.enum(PAYMENT_STATUSES).parse(input);
}
