import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {isSupportedCurrency} from "@/lib/money";

import {
  CAR_CATEGORIES,
  type CarBookingPayload,
  type CarSearchCriteria,
  type CarSearchFormValues
} from "../types";

type CarSearchSchemaMessages = {
  ageRange: string;
  dateRequired: string;
  dropoffAfterPickup: string;
  locationMinimum: string;
  timeRequired: string;
};

type CarBookingSchemaMessages = {
  contactEmailInvalid: string;
  contactEmailRequired: string;
  contactPhoneInvalid: string;
  driverFirstNameRequired: string;
  driverLastNameRequired: string;
  specialRequestsTooLong: string;
};

const defaultCarSearchMessages: CarSearchSchemaMessages = {
  ageRange: "Driver age must be between 21 and 80.",
  dateRequired: "Please select a date.",
  dropoffAfterPickup: "Drop-off must be after pickup.",
  locationMinimum: "Please enter at least 2 characters.",
  timeRequired: "Please select a time."
};

const defaultCarBookingMessages: CarBookingSchemaMessages = {
  contactEmailInvalid: "Enter a valid email address.",
  contactEmailRequired: "Enter an email address.",
  contactPhoneInvalid: "Enter a valid phone number.",
  driverFirstNameRequired: "Enter the driver's first name.",
  driverLastNameRequired: "Enter the driver's last name.",
  specialRequestsTooLong: "Special requests must be 1000 characters or less."
};

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00Z`).toISOString();
}

export function createCarSearchSchema(
  messages: CarSearchSchemaMessages = defaultCarSearchMessages
) {
  return z
    .object({
      driverAge: z.number().int().min(21, messages.ageRange).max(80, messages.ageRange),
      dropoffDate: z.string().min(1, messages.dateRequired),
      dropoffLocation: z.string().trim().min(2, messages.locationMinimum),
      dropoffTime: z.string().min(1, messages.timeRequired),
      pickupDate: z.string().min(1, messages.dateRequired),
      pickupLocation: z.string().trim().min(2, messages.locationMinimum),
      pickupTime: z.string().min(1, messages.timeRequired),
      preferredCategory: z.enum(CAR_CATEGORIES).optional()
    })
    .refine(
      (value) =>
        new Date(combineDateTime(value.dropoffDate, value.dropoffTime)) >
        new Date(combineDateTime(value.pickupDate, value.pickupTime)),
      {
        message: messages.dropoffAfterPickup,
        path: ["dropoffTime"]
      }
    );
}

function mapSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
) {
  const getValue = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }

    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    currency: getValue("currency") ?? "",
    driverAge: getValue("driverAge") ?? "30",
    dropoffDate: getValue("dropoffDate") ?? "",
    dropoffLocation: getValue("dropoffLocation") ?? "",
    dropoffTime: getValue("dropoffTime") ?? "",
    locale: getValue("locale") ?? "en",
    pickupDate: getValue("pickupDate") ?? "",
    pickupLocation: getValue("pickupLocation") ?? "",
    pickupTime: getValue("pickupTime") ?? "",
    preferredCategory: getValue("preferredCategory") ?? undefined
  };
}

export function parseCarSearchCriteria(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): CarSearchCriteria {
  const mapped = mapSearchParams(searchParams);
  const baseValues = createCarSearchSchema().parse({
    driverAge: Number(mapped.driverAge),
    dropoffDate: mapped.dropoffDate,
    dropoffLocation: mapped.dropoffLocation,
    dropoffTime: mapped.dropoffTime,
    pickupDate: mapped.pickupDate,
    pickupLocation: mapped.pickupLocation,
    pickupTime: mapped.pickupTime,
    preferredCategory: mapped.preferredCategory as CarSearchFormValues["preferredCategory"]
  });

  if (!isSupportedCurrency(mapped.currency)) {
    throw new Error("Unsupported car search currency.");
  }

  return {
    ...baseValues,
    currency: mapped.currency,
    locale: z.enum(locales).parse(mapped.locale)
  };
}

export function createCarBookingSchema(
  messages: CarBookingSchemaMessages = defaultCarBookingMessages
) {
  return z.object({
    contactEmail: z
      .string()
      .min(1, messages.contactEmailRequired)
      .email(messages.contactEmailInvalid),
    contactPhone: z
      .string()
      .trim()
      .regex(/^[+0-9()\-\s]{7,20}$/u, messages.contactPhoneInvalid)
      .or(z.literal(""))
      .optional(),
    driverFirstName: z.string().trim().min(1, messages.driverFirstNameRequired),
    driverLastName: z.string().trim().min(1, messages.driverLastNameRequired),
    specialRequests: z.string().trim().max(1000, messages.specialRequestsTooLong).optional()
  });
}

const carBookingRouteSchema = z.object({
  offerId: z.string().uuid(),
  searchLogId: z.string().uuid().optional()
});

export function parseCarBookingPayload(input: unknown): CarBookingPayload {
  const routePayload = carBookingRouteSchema.parse(input);
  const formPayload = createCarBookingSchema().parse(input);

  return {
    contactEmail: formPayload.contactEmail,
    contactPhone:
      typeof formPayload.contactPhone === "string" && formPayload.contactPhone.trim().length > 0
        ? formPayload.contactPhone
        : undefined,
    driverFirstName: formPayload.driverFirstName,
    driverLastName: formPayload.driverLastName,
    offerId: routePayload.offerId,
    searchLogId: routePayload.searchLogId,
    specialRequests:
      typeof formPayload.specialRequests === "string" &&
      formPayload.specialRequests.trim().length > 0
        ? formPayload.specialRequests
        : undefined
  };
}

export function getCarSearchDefaults(
  criteria: Partial<CarSearchCriteria> | undefined
): Partial<CarSearchFormValues> {
  return {
    driverAge: criteria?.driverAge ?? 30,
    dropoffDate: criteria?.dropoffDate ?? "",
    dropoffLocation: criteria?.dropoffLocation ?? "",
    dropoffTime: criteria?.dropoffTime ?? "",
    pickupDate: criteria?.pickupDate ?? "",
    pickupLocation: criteria?.pickupLocation ?? "",
    pickupTime: criteria?.pickupTime ?? "",
    preferredCategory: criteria?.preferredCategory
  };
}

export function toCarSearchIsoPickup(criteria: CarSearchCriteria) {
  return combineDateTime(criteria.pickupDate, criteria.pickupTime);
}

export function toCarSearchIsoDropoff(criteria: CarSearchCriteria) {
  return combineDateTime(criteria.dropoffDate, criteria.dropoffTime);
}
