import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {isSupportedCurrency} from "@/lib/money";

import {
  TOUR_CATEGORIES,
  TOUR_DURATION_OPTIONS,
  type NormalizedTourOffer,
  type TourBookingPayload,
  type TourSearchCriteria,
  type TourSearchFormValues
} from "../types";

type TourSearchSchemaMessages = {
  dateRequired: string;
  destinationMinimum: string;
};

type TourBookingSchemaMessages = {
  contactEmailInvalid: string;
  contactEmailRequired: string;
  contactPhoneInvalid: string;
  leadTravelerFirstNameRequired: string;
  leadTravelerLastNameRequired: string;
  participantRange: string;
  slotRequired: string;
  slotUnavailable: string;
  specialRequestsTooLong: string;
};

const defaultTourSearchMessages: TourSearchSchemaMessages = {
  dateRequired: "Please select a date.",
  destinationMinimum: "Please enter at least 2 characters."
};

const defaultTourBookingMessages: TourBookingSchemaMessages = {
  contactEmailInvalid: "Enter a valid email address.",
  contactEmailRequired: "Enter an email address.",
  contactPhoneInvalid: "Enter a valid phone number.",
  leadTravelerFirstNameRequired: "Enter the lead traveler's first name.",
  leadTravelerLastNameRequired: "Enter the lead traveler's last name.",
  participantRange: "Choose between 1 and 12 participants.",
  slotRequired: "Please choose an available time slot.",
  slotUnavailable: "The selected slot is no longer available for this participant count.",
  specialRequestsTooLong: "Special requests must be 1000 characters or less."
};

export function createTourSearchSchema(
  messages: TourSearchSchemaMessages = defaultTourSearchMessages
) {
  return z.object({
    category: z.enum(TOUR_CATEGORIES).optional(),
    destination: z.string().trim().min(2, messages.destinationMinimum),
    duration: z.enum(TOUR_DURATION_OPTIONS).optional(),
    serviceDate: z.string().min(1, messages.dateRequired)
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
    category: getValue("category") ?? undefined,
    currency: getValue("currency") ?? "",
    destination: getValue("destination") ?? "",
    duration: getValue("duration") ?? undefined,
    locale: getValue("locale") ?? "en",
    serviceDate: getValue("serviceDate") ?? ""
  };
}

export function parseTourSearchCriteria(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): TourSearchCriteria {
  const mapped = mapSearchParams(searchParams);
  const baseValues = createTourSearchSchema().parse({
    category: mapped.category as TourSearchFormValues["category"],
    destination: mapped.destination,
    duration: mapped.duration as TourSearchFormValues["duration"],
    serviceDate: mapped.serviceDate
  });

  if (!isSupportedCurrency(mapped.currency)) {
    throw new Error("Unsupported tours search currency.");
  }

  return {
    ...baseValues,
    currency: mapped.currency,
    locale: z.enum(locales).parse(mapped.locale)
  };
}

export function createTourBookingSchema(
  offer: NormalizedTourOffer,
  messages: TourBookingSchemaMessages = defaultTourBookingMessages
) {
  return z
    .object({
      adults: z
        .number()
        .int()
        .min(1, messages.participantRange)
        .max(12, messages.participantRange),
      children: z
        .number()
        .int()
        .min(0, messages.participantRange)
        .max(10, messages.participantRange),
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
      leadTravelerFirstName: z
        .string()
        .trim()
        .min(1, messages.leadTravelerFirstNameRequired),
      leadTravelerLastName: z
        .string()
        .trim()
        .min(1, messages.leadTravelerLastNameRequired),
      selectedAddOnCodes: z.array(z.string()).default([]),
      slotId: z.string().min(1, messages.slotRequired),
      specialRequests: z.string().trim().max(1000, messages.specialRequestsTooLong).optional()
    })
    .superRefine((value, ctx) => {
      const participantTotal = value.adults + value.children;
      const slot = offer.availabilitySlots.find(
        (availabilitySlot) => availabilitySlot.slotId === value.slotId
      );

      if (participantTotal < 1 || participantTotal > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.participantRange,
          path: ["adults"]
        });
      }

      if (!slot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.slotRequired,
          path: ["slotId"]
        });
      } else if (slot.soldOut || slot.remainingCapacity < participantTotal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.slotUnavailable,
          path: ["slotId"]
        });
      }

      const invalidAddOn = value.selectedAddOnCodes.find(
        (code) => !offer.addOns.some((addOn) => addOn.code === code)
      );

      if (invalidAddOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.slotUnavailable,
          path: ["selectedAddOnCodes"]
        });
      }
    });
}

const tourBookingRouteSchema = z.object({
  offerId: z.string().uuid(),
  searchLogId: z.string().uuid().optional()
});

export function parseTourBookingPayload(
  input: unknown,
  offer: NormalizedTourOffer
): TourBookingPayload {
  const routePayload = tourBookingRouteSchema.parse(input);
  const formPayload = createTourBookingSchema(offer).parse(input);

  return {
    adults: formPayload.adults,
    children: formPayload.children,
    contactEmail: formPayload.contactEmail,
    contactPhone:
      typeof formPayload.contactPhone === "string" && formPayload.contactPhone.trim().length > 0
        ? formPayload.contactPhone
        : undefined,
    leadTravelerFirstName: formPayload.leadTravelerFirstName,
    leadTravelerLastName: formPayload.leadTravelerLastName,
    offerId: routePayload.offerId,
    searchLogId: routePayload.searchLogId,
    selectedAddOnCodes: formPayload.selectedAddOnCodes ?? [],
    slotId: formPayload.slotId,
    specialRequests:
      typeof formPayload.specialRequests === "string" &&
      formPayload.specialRequests.trim().length > 0
        ? formPayload.specialRequests
        : undefined
  };
}

export function getTourSearchDefaults(
  criteria: Partial<TourSearchCriteria> | undefined
): Partial<TourSearchFormValues> {
  return {
    category: criteria?.category,
    destination: criteria?.destination ?? "",
    duration: criteria?.duration,
    serviceDate: criteria?.serviceDate ?? ""
  };
}

export function getDefaultTourSlotId(offer: NormalizedTourOffer) {
  return (
    offer.availabilitySlots.find((availabilitySlot) => !availabilitySlot.soldOut)?.slotId ??
    offer.availabilitySlots[0]?.slotId ??
    ""
  );
}
