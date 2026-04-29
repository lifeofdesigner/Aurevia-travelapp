import {z} from "zod";

import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency
} from "@/lib/money";
import {locales} from "@/lib/i18n/routing";
import {CABIN_CLASSES} from "@/types/database-enums";

import {
  FLIGHT_SORT_OPTIONS,
  FLIGHT_TIME_WINDOWS,
  FLIGHT_TRAVELER_TYPES,
  SUPPORTED_FLIGHT_TRIP_TYPES,
  type FlightBookingPayload,
  type FlightResultsFilters,
  type FlightSearchCriteria
} from "../types";

type FlightSearchValidationMessages = {
  adultsRange: string;
  childrenRange: string;
  dateRequired: string;
  destinationMustDiffer: string;
  infantsLimit: string;
  infantsRange: string;
  minimumTwoCharacters: string;
  returnAfterDeparture: string;
  returnDateRequired: string;
  totalPassengersRange: string;
};

type FlightBookingValidationMessages = {
  contactEmailInvalid: string;
  contactEmailRequired: string;
  contactPhoneInvalid: string;
  dateOfBirthInvalid: string;
  firstNameRequired: string;
  lastNameRequired: string;
  specialRequestsTooLong: string;
};

const defaultFlightSearchValidationMessages: FlightSearchValidationMessages = {
  adultsRange: "Choose between 1 and 6 adults.",
  childrenRange: "Choose between 0 and 6 children.",
  dateRequired: "Select a date.",
  destinationMustDiffer: "Origin and destination must be different.",
  infantsLimit: "Infants cannot exceed adults.",
  infantsRange: "Choose between 0 and 4 infants.",
  minimumTwoCharacters: "Enter at least 2 characters.",
  returnAfterDeparture: "Return date must be on or after the departure date.",
  returnDateRequired: "Return date is required for round-trip searches.",
  totalPassengersRange: "Choose between 1 and 9 travelers in total."
};

const defaultFlightBookingValidationMessages: FlightBookingValidationMessages = {
  contactEmailInvalid: "Enter a valid email address.",
  contactEmailRequired: "Enter an email address.",
  contactPhoneInvalid: "Enter at least 6 characters or leave the field empty.",
  dateOfBirthInvalid: "Enter a valid date of birth.",
  firstNameRequired: "Enter a first name.",
  lastNameRequired: "Enter a last name.",
  specialRequestsTooLong: "Special requests must be 1000 characters or fewer."
};

export function createFlightSearchSchema(
  messages: FlightSearchValidationMessages = defaultFlightSearchValidationMessages
) {
  return z
    .object({
      tripType: z.enum(SUPPORTED_FLIGHT_TRIP_TYPES),
      origin: z.string().trim().min(2, messages.minimumTwoCharacters),
      destination: z.string().trim().min(2, messages.minimumTwoCharacters),
      departureDate: z.string().min(1, messages.dateRequired),
      returnDate: z.string().optional(),
      adults: z.coerce.number().int().min(1, messages.adultsRange).max(6, messages.adultsRange),
      children: z.coerce
        .number()
        .int()
        .min(0, messages.childrenRange)
        .max(6, messages.childrenRange),
      infants: z.coerce
        .number()
        .int()
        .min(0, messages.infantsRange)
        .max(4, messages.infantsRange),
      cabinClass: z.enum(CABIN_CLASSES),
      currency: z
        .enum(SUPPORTED_CURRENCIES)
        .default(DEFAULT_CURRENCY as SupportedCurrency),
      locale: z.enum(locales)
    })
    .superRefine((value, context) => {
      if (value.origin.trim().toLowerCase() === value.destination.trim().toLowerCase()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destination"],
          message: messages.destinationMustDiffer
        });
      }

      if (value.tripType === "round_trip" && !value.returnDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: messages.returnDateRequired
        });
      }

      if (
        value.returnDate &&
        new Date(value.returnDate).getTime() < new Date(value.departureDate).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: messages.returnAfterDeparture
        });
      }

      if (value.infants > value.adults) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["infants"],
          message: messages.infantsLimit
        });
      }

      if (value.adults + value.children + value.infants > 9) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["adults"],
          message: messages.totalPassengersRange
        });
      }
    });
}

export const flightSearchCriteriaSchema = createFlightSearchSchema();

function parseCommaSeparatedValues(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseMultiCitySegments(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((entry) => {
      const [origin, destination, departureDate] = entry.split(":");

      return {
        departureDate: departureDate?.trim() ?? "",
        destination: destination?.trim().toUpperCase() ?? "",
        origin: origin?.trim().toUpperCase() ?? ""
      };
    })
    .filter(
      (segment) =>
        /^[A-Z]{3}$/.test(segment.origin) &&
        /^[A-Z]{3}$/.test(segment.destination) &&
        /^\d{4}-\d{2}-\d{2}$/.test(segment.departureDate) &&
        segment.origin !== segment.destination
    );
}

export const flightResultsFiltersSchema = z.object({
  sort: z.enum(FLIGHT_SORT_OPTIONS).default("best"),
  airlines: z.array(z.string()).default([]),
  stops: z.array(z.coerce.number().int().min(0).max(2)).default([]),
  departureWindows: z.array(z.enum(FLIGHT_TIME_WINDOWS)).default([]),
  arrivalWindows: z.array(z.enum(FLIGHT_TIME_WINDOWS)).default([]),
  cabins: z.array(z.enum(CABIN_CLASSES)).default([]),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  refundable: z.coerce.boolean().default(false),
  baggageIncluded: z.coerce.boolean().default(false)
});

export function parseFlightResultsFilters(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): FlightResultsFilters {
  const getValue = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }

    const value = searchParams[key];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  };

  return flightResultsFiltersSchema.parse({
    sort: getValue("sort") ?? "best",
    airlines: parseCommaSeparatedValues(getValue("airlines")),
    stops: parseCommaSeparatedValues(getValue("stops")).map(Number),
    departureWindows: parseCommaSeparatedValues(getValue("departureWindow")),
    arrivalWindows: parseCommaSeparatedValues(getValue("arrivalWindow")),
    cabins: parseCommaSeparatedValues(getValue("cabin")),
    priceMin: getValue("priceMin"),
    priceMax: getValue("priceMax"),
    refundable: getValue("refundable") === "true",
    baggageIncluded: getValue("baggageIncluded") === "true"
  });
}

export function parseFlightSearchCriteria(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): FlightSearchCriteria {
  if (input instanceof URLSearchParams) {
    const criteria = flightSearchCriteriaSchema.parse({
      tripType: input.get("tripType") ?? "round_trip",
      origin: input.get("origin") ?? "",
      destination: input.get("destination") ?? "",
      departureDate: input.get("departureDate") ?? "",
      returnDate: input.get("returnDate") ?? undefined,
      adults: input.get("adults") ?? 1,
      children: input.get("children") ?? 0,
      infants: input.get("infants") ?? 0,
      cabinClass: input.get("cabinClass") ?? "economy",
      currency: input.get("currency") ?? DEFAULT_CURRENCY,
      locale: input.get("locale") ?? "en"
    });
    const multiCitySegments = parseMultiCitySegments(input.get("segments") ?? undefined);

    return {
      ...criteria,
      ...(criteria.tripType === "multi_city" && multiCitySegments.length > 0
        ? {multiCitySegments}
        : {})
    };
  }

  const segmentsValue = Array.isArray(input.segments) ? input.segments[0] : input.segments;
  const criteria = flightSearchCriteriaSchema.parse({
    tripType: Array.isArray(input.tripType) ? input.tripType[0] : input.tripType,
    origin: Array.isArray(input.origin) ? input.origin[0] : input.origin,
    destination: Array.isArray(input.destination)
      ? input.destination[0]
      : input.destination,
    departureDate: Array.isArray(input.departureDate)
      ? input.departureDate[0]
      : input.departureDate,
    returnDate: Array.isArray(input.returnDate)
      ? input.returnDate[0]
      : input.returnDate,
    adults: Array.isArray(input.adults) ? input.adults[0] : input.adults,
    children: Array.isArray(input.children) ? input.children[0] : input.children,
    infants: Array.isArray(input.infants) ? input.infants[0] : input.infants,
    cabinClass: Array.isArray(input.cabinClass)
      ? input.cabinClass[0]
      : input.cabinClass,
    currency: Array.isArray(input.currency) ? input.currency[0] : input.currency,
    locale: Array.isArray(input.locale) ? input.locale[0] : input.locale
  });
  const multiCitySegments = parseMultiCitySegments(segmentsValue);

  return {
    ...criteria,
    ...(criteria.tripType === "multi_city" && multiCitySegments.length > 0
      ? {multiCitySegments}
      : {})
  };
}

export function createFlightBookingSchema(
  travelerCount: number,
  messages: FlightBookingValidationMessages = defaultFlightBookingValidationMessages
) {
  return z.object({
    contactEmail: z
      .string()
      .min(1, messages.contactEmailRequired)
      .email(messages.contactEmailInvalid),
    contactPhone: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || value.length >= 6,
        messages.contactPhoneInvalid
      ),
    offerId: z.string().uuid(),
    searchLogId: z.string().uuid().optional(),
    saveTravelerProfiles: z.boolean(),
    specialRequests: z
      .string()
      .trim()
      .max(1000, messages.specialRequestsTooLong)
      .optional(),
    travelers: z
      .array(
        z.object({
          travelerType: z.enum(FLIGHT_TRAVELER_TYPES),
          firstName: z.string().trim().min(1, messages.firstNameRequired),
          lastName: z.string().trim().min(1, messages.lastNameRequired),
          dateOfBirth: z
            .string()
            .optional()
            .refine(
              (value) =>
                !value || !Number.isNaN(new Date(value).getTime()),
              messages.dateOfBirthInvalid
            )
        })
      )
      .length(travelerCount)
  });
}

export function parseFlightBookingPayload(
  payload: unknown,
  travelerCount: number
): FlightBookingPayload {
  return createFlightBookingSchema(travelerCount).parse(payload);
}
