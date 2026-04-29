import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {isSupportedCurrency} from "@/lib/money";

import {
  HOTEL_GUEST_TYPES,
  HOTEL_PROPERTY_TYPES,
  type HotelBookingPayload,
  type HotelSearchCriteria,
  type HotelSearchFormValues
} from "../types";

type HotelSearchSchemaMessages = {
  checkOutAfterCheckIn: string;
  checkOutRequired: string;
  checkInRequired: string;
  guestsAtLeastRooms: string;
  guestsRange: string;
  minimumTwoCharacters: string;
  roomsRange: string;
  starRange: string;
};

type HotelBookingSchemaMessages = {
  contactEmailInvalid: string;
  contactEmailRequired: string;
  contactPhoneInvalid: string;
  guestCountMismatch: string;
  guestFirstNameRequired: string;
  guestLastNameRequired: string;
  specialRequestsTooLong: string;
};

const defaultHotelSearchMessages: HotelSearchSchemaMessages = {
  checkOutAfterCheckIn: "Check-out must be after check-in.",
  checkOutRequired: "Please select a check-out date.",
  checkInRequired: "Please select a check-in date.",
  guestsAtLeastRooms: "Guests must be at least the room count.",
  guestsRange: "Choose between 1 and 12 guests.",
  minimumTwoCharacters: "Please enter at least 2 characters.",
  roomsRange: "Choose between 1 and 4 rooms.",
  starRange: "Choose a rating between 1 and 5 stars."
};

const defaultHotelBookingMessages: HotelBookingSchemaMessages = {
  contactEmailInvalid: "Enter a valid email address.",
  contactEmailRequired: "Enter an email address.",
  contactPhoneInvalid: "Enter a valid phone number.",
  guestCountMismatch: "Guest details do not match the selected room.",
  guestFirstNameRequired: "Enter the guest's first name.",
  guestLastNameRequired: "Enter the guest's last name.",
  specialRequestsTooLong: "Special requests must be 1000 characters or less."
};

export function createHotelSearchSchema(
  messages: HotelSearchSchemaMessages = defaultHotelSearchMessages
) {
  return z
    .object({
      checkIn: z.string().min(1, messages.checkInRequired),
      checkOut: z.string().min(1, messages.checkOutRequired),
      destination: z
        .string()
        .trim()
        .min(2, messages.minimumTwoCharacters),
      guests: z.number().int().min(1, messages.guestsRange).max(12, messages.guestsRange),
      preferredStarRating: z
        .number()
        .int()
        .min(1, messages.starRange)
        .max(5, messages.starRange)
        .optional(),
      propertyType: z.enum(HOTEL_PROPERTY_TYPES).optional(),
      rooms: z.number().int().min(1, messages.roomsRange).max(4, messages.roomsRange)
    })
    .refine((value) => new Date(value.checkOut) > new Date(value.checkIn), {
      message: messages.checkOutAfterCheckIn,
      path: ["checkOut"]
    })
    .refine((value) => value.guests >= value.rooms, {
      message: messages.guestsAtLeastRooms,
      path: ["rooms"]
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
    checkIn: getValue("checkIn") ?? "",
    checkOut: getValue("checkOut") ?? "",
    currency: getValue("currency") ?? "",
    destination: getValue("destination") ?? "",
    guests: getValue("guests") ?? "1",
    locale: getValue("locale") ?? "en",
    preferredStarRating: getValue("preferredStarRating") ?? undefined,
    propertyType: getValue("propertyType") ?? undefined,
    rooms: getValue("rooms") ?? "1"
  };
}

export function parseHotelSearchCriteria(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): HotelSearchCriteria {
  const mapped = mapSearchParams(searchParams);
  const baseValues = createHotelSearchSchema().parse({
    checkIn: mapped.checkIn,
    checkOut: mapped.checkOut,
    destination: mapped.destination,
    guests: Number(mapped.guests),
    preferredStarRating: mapped.preferredStarRating
      ? Number(mapped.preferredStarRating)
      : undefined,
    propertyType: mapped.propertyType as HotelSearchFormValues["propertyType"],
    rooms: Number(mapped.rooms)
  });

  if (!isSupportedCurrency(mapped.currency)) {
    throw new Error("Unsupported hotel search currency.");
  }

  const localeSchema = z.enum(locales);

  return {
    ...baseValues,
    currency: mapped.currency,
    locale: localeSchema.parse(mapped.locale)
  };
}

export function createHotelBookingSchema(
  expectedGuestCount: number,
  messages: HotelBookingSchemaMessages = defaultHotelBookingMessages
) {
  return z
    .object({
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
      guests: z
        .array(
          z.object({
            firstName: z.string().trim().min(1, messages.guestFirstNameRequired),
            guestType: z.enum(HOTEL_GUEST_TYPES),
            lastName: z.string().trim().min(1, messages.guestLastNameRequired)
          })
        )
        .length(expectedGuestCount, messages.guestCountMismatch),
      specialRequests: z.string().trim().max(1000, messages.specialRequestsTooLong).optional()
    });
}

const hotelBookingRouteSchema = z.object({
  offerId: z.string().uuid(),
  searchLogId: z.string().uuid().optional()
});

export function parseHotelBookingPayload(
  input: unknown,
  expectedGuestCount: number
): HotelBookingPayload {
  const routePayload = hotelBookingRouteSchema.parse(input);
  const formPayload = createHotelBookingSchema(expectedGuestCount).parse(input);

  return {
    ...formPayload,
    contactPhone:
      typeof formPayload.contactPhone === "string" && formPayload.contactPhone.trim().length > 0
        ? formPayload.contactPhone
        : undefined,
    offerId: routePayload.offerId,
    searchLogId: routePayload.searchLogId,
    specialRequests:
      typeof formPayload.specialRequests === "string" &&
      formPayload.specialRequests.trim().length > 0
        ? formPayload.specialRequests
        : undefined
  };
}

export function getHotelSearchDefaults(
  criteria: Partial<HotelSearchCriteria> | undefined
): Partial<HotelSearchFormValues> {
  return {
    checkIn: criteria?.checkIn ?? "",
    checkOut: criteria?.checkOut ?? "",
    destination: criteria?.destination ?? "",
    guests: criteria?.guests ?? 2,
    preferredStarRating: criteria?.preferredStarRating,
    propertyType: criteria?.propertyType,
    rooms: criteria?.rooms ?? 1
  };
}
