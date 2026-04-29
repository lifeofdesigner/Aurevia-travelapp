import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {isSupportedCurrency} from "@/lib/money";

import {
  TRANSFER_ROUTE_MODES,
  TRANSFER_VEHICLE_CLASSES,
  type TransferBookingPayload,
  type TransferSearchCriteria,
  type TransferSearchFormValues
} from "../types";

type TransferSearchSchemaMessages = {
  airportRequired: string;
  dateRequired: string;
  flightNumberRequired: string;
  locationMinimum: string;
  luggageRange: string;
  passengersRange: string;
  timeRequired: string;
};

type TransferBookingSchemaMessages = {
  contactEmailInvalid: string;
  contactEmailRequired: string;
  contactPhoneInvalid: string;
  leadPassengerFirstNameRequired: string;
  leadPassengerLastNameRequired: string;
  specialRequestsTooLong: string;
};

const defaultTransferSearchMessages: TransferSearchSchemaMessages = {
  airportRequired: "Please select an airport.",
  dateRequired: "Please select a date.",
  flightNumberRequired: "Enter the flight number for airport transfers.",
  locationMinimum: "Please enter at least 2 characters.",
  luggageRange: "Choose between 0 and 12 bags.",
  passengersRange: "Choose between 1 and 12 passengers.",
  timeRequired: "Please select a time."
};

const defaultTransferBookingMessages: TransferBookingSchemaMessages = {
  contactEmailInvalid: "Enter a valid email address.",
  contactEmailRequired: "Enter an email address.",
  contactPhoneInvalid: "Enter a valid phone number.",
  leadPassengerFirstNameRequired: "Enter the lead passenger's first name.",
  leadPassengerLastNameRequired: "Enter the lead passenger's last name.",
  specialRequestsTooLong: "Special requests must be 1000 characters or less."
};

export function createTransferSearchSchema(
  messages: TransferSearchSchemaMessages = defaultTransferSearchMessages
) {
  return z
    .object({
      airportCode: z.string().trim().optional(),
      dropoffLocation: z.string().trim(),
      flightNumber: z.string().trim().optional(),
      luggageCount: z.number().int().min(0, messages.luggageRange).max(12, messages.luggageRange),
      meetAndGreet: z.boolean(),
      passengerCount: z
        .number()
        .int()
        .min(1, messages.passengersRange)
        .max(12, messages.passengersRange),
      pickupDate: z.string().min(1, messages.dateRequired),
      pickupLocation: z.string().trim(),
      pickupTime: z.string().min(1, messages.timeRequired),
      routeMode: z.enum(TRANSFER_ROUTE_MODES),
      vehicleClass: z.enum(TRANSFER_VEHICLE_CLASSES).optional()
    })
    .superRefine((value, ctx) => {
      if (
        value.routeMode === "point_to_point" ||
        value.routeMode === "hotel_to_airport"
      ) {
        if (value.pickupLocation.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.locationMinimum,
            path: ["pickupLocation"]
          });
        }
      }

      if (
        value.routeMode === "point_to_point" ||
        value.routeMode === "airport_to_hotel"
      ) {
        if (value.dropoffLocation.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.locationMinimum,
            path: ["dropoffLocation"]
          });
        }
      }

      if (value.routeMode !== "point_to_point") {
        if (!value.airportCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.airportRequired,
            path: ["airportCode"]
          });
        }

        if (!value.flightNumber || value.flightNumber.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.flightNumberRequired,
            path: ["flightNumber"]
          });
        }
      }
    });
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
    airportCode: getValue("airportCode") ?? undefined,
    currency: getValue("currency") ?? "",
    dropoffLocation: getValue("dropoffLocation") ?? "",
    flightNumber: getValue("flightNumber") ?? undefined,
    locale: getValue("locale") ?? "en",
    luggageCount: getValue("luggageCount") ?? "1",
    meetAndGreet: getValue("meetAndGreet") === "1",
    passengerCount: getValue("passengerCount") ?? "2",
    pickupDate: getValue("pickupDate") ?? "",
    pickupLocation: getValue("pickupLocation") ?? "",
    pickupTime: getValue("pickupTime") ?? "",
    routeMode: getValue("routeMode") ?? "airport_to_hotel",
    vehicleClass: getValue("vehicleClass") ?? undefined
  };
}

export function parseTransferSearchCriteria(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): TransferSearchCriteria {
  const mapped = mapSearchParams(searchParams);
  const baseValues = createTransferSearchSchema().parse({
    airportCode: mapped.airportCode,
    dropoffLocation: mapped.dropoffLocation,
    flightNumber: mapped.flightNumber,
    luggageCount: Number(mapped.luggageCount),
    meetAndGreet: mapped.meetAndGreet,
    passengerCount: Number(mapped.passengerCount),
    pickupDate: mapped.pickupDate,
    pickupLocation: mapped.pickupLocation,
    pickupTime: mapped.pickupTime,
    routeMode: mapped.routeMode as TransferSearchFormValues["routeMode"],
    vehicleClass: mapped.vehicleClass as TransferSearchFormValues["vehicleClass"]
  });

  if (!isSupportedCurrency(mapped.currency)) {
    throw new Error("Unsupported transfer search currency.");
  }

  return {
    ...baseValues,
    airportCode:
      typeof baseValues.airportCode === "string" && baseValues.airportCode.length > 0
        ? baseValues.airportCode
        : undefined,
    currency: mapped.currency,
    flightNumber:
      typeof baseValues.flightNumber === "string" && baseValues.flightNumber.length > 0
        ? baseValues.flightNumber
        : undefined,
    locale: z.enum(locales).parse(mapped.locale)
  };
}

export function createTransferBookingSchema(
  messages: TransferBookingSchemaMessages = defaultTransferBookingMessages
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
    flightNumber: z.string().trim().optional(),
    leadPassengerFirstName: z
      .string()
      .trim()
      .min(1, messages.leadPassengerFirstNameRequired),
    leadPassengerLastName: z
      .string()
      .trim()
      .min(1, messages.leadPassengerLastNameRequired),
    specialRequests: z.string().trim().max(1000, messages.specialRequestsTooLong).optional()
  });
}

const transferBookingRouteSchema = z.object({
  offerId: z.string().uuid(),
  searchLogId: z.string().uuid().optional()
});

export function parseTransferBookingPayload(input: unknown): TransferBookingPayload {
  const routePayload = transferBookingRouteSchema.parse(input);
  const formPayload = createTransferBookingSchema().parse(input);

  return {
    contactEmail: formPayload.contactEmail,
    contactPhone:
      typeof formPayload.contactPhone === "string" && formPayload.contactPhone.trim().length > 0
        ? formPayload.contactPhone
        : undefined,
    flightNumber:
      typeof formPayload.flightNumber === "string" && formPayload.flightNumber.trim().length > 0
        ? formPayload.flightNumber
        : undefined,
    leadPassengerFirstName: formPayload.leadPassengerFirstName,
    leadPassengerLastName: formPayload.leadPassengerLastName,
    offerId: routePayload.offerId,
    searchLogId: routePayload.searchLogId,
    specialRequests:
      typeof formPayload.specialRequests === "string" &&
      formPayload.specialRequests.trim().length > 0
        ? formPayload.specialRequests
        : undefined
  };
}

export function getTransferSearchDefaults(
  criteria: Partial<TransferSearchCriteria> | undefined
): Partial<TransferSearchFormValues> {
  return {
    airportCode: criteria?.airportCode,
    dropoffLocation: criteria?.dropoffLocation ?? "",
    flightNumber: criteria?.flightNumber,
    luggageCount: criteria?.luggageCount ?? 1,
    meetAndGreet: criteria?.meetAndGreet ?? false,
    passengerCount: criteria?.passengerCount ?? 2,
    pickupDate: criteria?.pickupDate ?? "",
    pickupLocation: criteria?.pickupLocation ?? "",
    pickupTime: criteria?.pickupTime ?? "",
    routeMode: criteria?.routeMode ?? "airport_to_hotel",
    vehicleClass: criteria?.vehicleClass
  };
}

export function toTransferSearchIsoPickup(criteria: TransferSearchCriteria) {
  return new Date(`${criteria.pickupDate}T${criteria.pickupTime}:00Z`).toISOString();
}
