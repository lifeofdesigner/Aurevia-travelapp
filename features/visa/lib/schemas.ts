import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {
  findVisaCountryOptionByQuery,
  VISA_COUNTRY_OPTIONS
} from "@/features/visa/lib/catalog";

import {
  VISA_PURPOSES,
  VISA_RESIDENCY_STATUSES,
  VISA_PRODUCT_TYPES,
  type VisaApplicationDraftValues,
  type VisaApplicationFormValues,
  type VisaCatalogSearchCriteria,
  type VisaCatalogSearchValues
} from "../types";

type VisaSearchMessages = {
  countryRequired: string;
  travelDateRequired: string;
};

type VisaApplicationMessages = {
  acknowledgementsRequired: string;
  companionDateRequired: string;
  companionNameRequired: string;
  companionRelationshipRequired: string;
  dateOfBirthRequired: string;
  departureAfterArrival: string;
  destinationRequired: string;
  emailInvalid: string;
  emailRequired: string;
  firstNameRequired: string;
  lastNameRequired: string;
  nationalityRequired: string;
  passportCountryRequired: string;
  passportExpiryAfterDeparture: string;
  passportExpiryRequired: string;
  passportIssuedBeforeExpiry: string;
  passportIssuedRequired: string;
  passportNumberRequired: string;
  phoneInvalid: string;
  purposeRequired: string;
  residencyAddressRequired: string;
  residencyCityRequired: string;
  residencyCountryRequired: string;
  residencyStatusRequired: string;
  tooManyCompanions: string;
  travelDateRequired: string;
};

const defaultVisaSearchMessages: VisaSearchMessages = {
  countryRequired: "Please choose a country.",
  travelDateRequired: "Please select a date."
};

const defaultVisaApplicationMessages: VisaApplicationMessages = {
  acknowledgementsRequired: "Please confirm the required acknowledgements.",
  companionDateRequired: "Enter the companion's date of birth.",
  companionNameRequired: "Enter the companion's full name.",
  companionRelationshipRequired: "Enter the companion's relationship.",
  dateOfBirthRequired: "Enter the applicant's date of birth.",
  departureAfterArrival: "Departure must be on or after the arrival date.",
  destinationRequired: "Choose a destination country.",
  emailInvalid: "Enter a valid email address.",
  emailRequired: "Enter an email address.",
  firstNameRequired: "Enter the applicant's first name.",
  lastNameRequired: "Enter the applicant's last name.",
  nationalityRequired: "Choose the applicant's nationality.",
  passportCountryRequired: "Choose the passport issuing country.",
  passportExpiryAfterDeparture: "Passport expiry must be after the intended departure date.",
  passportExpiryRequired: "Enter the passport expiry date.",
  passportIssuedBeforeExpiry: "Passport issue date must be before the expiry date.",
  passportIssuedRequired: "Enter the passport issue date.",
  passportNumberRequired: "Enter the passport number.",
  phoneInvalid: "Enter a valid phone number.",
  purposeRequired: "Choose the purpose of travel.",
  residencyAddressRequired: "Enter the current residence address.",
  residencyCityRequired: "Enter the current residence city.",
  residencyCountryRequired: "Choose the current residence country.",
  residencyStatusRequired: "Choose the current residence status.",
  tooManyCompanions: "Add up to 4 companions only.",
  travelDateRequired: "Enter the travel dates."
};

function countryCodeSchema(message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => findVisaCountryOptionByQuery(value) !== null, {
      message
    })
    .transform((value) => findVisaCountryOptionByQuery(value)?.code ?? value.trim().toUpperCase());
}

export function createVisaCatalogSearchSchema(
  messages: VisaSearchMessages = defaultVisaSearchMessages
) {
  return z.object({
    destinationCountry: countryCodeSchema(messages.countryRequired),
    nationality: countryCodeSchema(messages.countryRequired),
    travelDate: z.string().min(1, messages.travelDateRequired)
  });
}

function getValue(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string
) {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }

  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseVisaCatalogSearchCriteria(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): VisaCatalogSearchCriteria {
  const locale = z.enum(locales).parse(getValue(searchParams, "locale") ?? "en");
  const values = createVisaCatalogSearchSchema().parse({
    destinationCountry: getValue(searchParams, "destinationCountry") ?? "",
    nationality: getValue(searchParams, "nationality") ?? "",
    travelDate: getValue(searchParams, "travelDate") ?? ""
  });

  return {
    ...values,
    locale
  };
}

export function getVisaSearchDefaults(
  criteria: Partial<VisaCatalogSearchValues> | undefined
): Partial<VisaCatalogSearchValues> {
  return {
    destinationCountry: criteria?.destinationCountry ?? "",
    nationality: criteria?.nationality ?? "",
    travelDate: criteria?.travelDate ?? ""
  };
}

export function getVisaApplicationDefaults(
  values: Partial<VisaApplicationDraftValues> | undefined,
  destinationCountryCode: string,
  nationalityCountryCode?: string,
  travelDate?: string
): VisaApplicationFormValues {
  return {
    acknowledgeInformationAccuracy: values?.acknowledgeInformationAccuracy ?? false,
    acknowledgeServiceScope: values?.acknowledgeServiceScope ?? false,
    companions:
      values?.companions?.map((companion) => ({
        dateOfBirth: companion.dateOfBirth ?? "",
        fullName: companion.fullName ?? "",
        passportNumber: companion.passportNumber ?? "",
        relationship: companion.relationship ?? ""
      })) ?? [],
    dateOfBirth: values?.dateOfBirth ?? "",
    destinationCountryCode: values?.destinationCountryCode ?? destinationCountryCode,
    email: values?.email ?? "",
    firstName: values?.firstName ?? "",
    intendedArrivalDate: values?.intendedArrivalDate ?? travelDate ?? "",
    intendedDepartureDate: values?.intendedDepartureDate ?? "",
    lastName: values?.lastName ?? "",
    nationalityCountryCode: values?.nationalityCountryCode ?? nationalityCountryCode ?? "",
    passportCountryCode: values?.passportCountryCode ?? nationalityCountryCode ?? "",
    passportExpiresOn: values?.passportExpiresOn ?? "",
    passportIssuedOn: values?.passportIssuedOn ?? "",
    passportNumber: values?.passportNumber ?? "",
    phone: values?.phone ?? "",
    purposeOfTravel: values?.purposeOfTravel ?? "tourism",
    purposeOfTravelDetails: values?.purposeOfTravelDetails ?? "",
    residencyAddressLine1: values?.residencyAddressLine1 ?? "",
    residencyAddressLine2: values?.residencyAddressLine2 ?? "",
    residencyCity: values?.residencyCity ?? "",
    residencyCountryCode: values?.residencyCountryCode ?? nationalityCountryCode ?? "",
    residencyStatus: values?.residencyStatus ?? "citizen"
  };
}

export function createVisaApplicationSchema(
  messages: VisaApplicationMessages = defaultVisaApplicationMessages
) {
  return z
    .object({
      acknowledgeInformationAccuracy: z
        .boolean()
        .refine((value) => value, messages.acknowledgementsRequired),
      acknowledgeServiceScope: z
        .boolean()
        .refine((value) => value, messages.acknowledgementsRequired),
      companions: z
        .array(
          z.object({
            dateOfBirth: z.string().min(1, messages.companionDateRequired),
            fullName: z.string().trim().min(1, messages.companionNameRequired),
            passportNumber: z.string().trim().optional(),
            relationship: z.string().trim().min(1, messages.companionRelationshipRequired)
          })
        )
        .max(4, messages.tooManyCompanions),
      dateOfBirth: z.string().min(1, messages.dateOfBirthRequired),
      destinationCountryCode: countryCodeSchema(messages.destinationRequired),
      email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
      firstName: z.string().trim().min(1, messages.firstNameRequired),
      intendedArrivalDate: z.string().min(1, messages.travelDateRequired),
      intendedDepartureDate: z.string().min(1, messages.travelDateRequired),
      lastName: z.string().trim().min(1, messages.lastNameRequired),
      nationalityCountryCode: countryCodeSchema(messages.nationalityRequired),
      passportCountryCode: countryCodeSchema(messages.passportCountryRequired),
      passportExpiresOn: z.string().min(1, messages.passportExpiryRequired),
      passportIssuedOn: z.string().min(1, messages.passportIssuedRequired),
      passportNumber: z.string().trim().min(1, messages.passportNumberRequired),
      phone: z
        .string()
        .trim()
        .regex(/^[+0-9()\-\s]{7,20}$/u, messages.phoneInvalid)
        .or(z.literal(""))
        .optional(),
      purposeOfTravel: z.enum(VISA_PURPOSES, {
        message: messages.purposeRequired
      }),
      purposeOfTravelDetails: z.string().trim().optional(),
      residencyAddressLine1: z.string().trim().min(1, messages.residencyAddressRequired),
      residencyAddressLine2: z.string().trim().optional(),
      residencyCity: z.string().trim().min(1, messages.residencyCityRequired),
      residencyCountryCode: countryCodeSchema(messages.residencyCountryRequired),
      residencyStatus: z.enum(VISA_RESIDENCY_STATUSES, {
        message: messages.residencyStatusRequired
      })
    })
    .refine(
      (value) => new Date(value.intendedDepartureDate) >= new Date(value.intendedArrivalDate),
      {
        message: messages.departureAfterArrival,
        path: ["intendedDepartureDate"]
      }
    )
    .refine((value) => new Date(value.passportIssuedOn) < new Date(value.passportExpiresOn), {
      message: messages.passportIssuedBeforeExpiry,
      path: ["passportIssuedOn"]
    })
    .refine(
      (value) => new Date(value.passportExpiresOn) > new Date(value.intendedDepartureDate),
      {
        message: messages.passportExpiryAfterDeparture,
        path: ["passportExpiresOn"]
      }
    );
}

const visaApplicationDraftSchema = z.object({
  acknowledgeInformationAccuracy: z.boolean().optional(),
  acknowledgeServiceScope: z.boolean().optional(),
  companions: z
    .array(
      z.object({
        dateOfBirth: z.string().optional(),
        fullName: z.string().optional(),
        passportNumber: z.string().optional(),
        relationship: z.string().optional()
      })
    )
    .optional(),
  dateOfBirth: z.string().optional(),
  destinationCountryCode: z.string().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  intendedArrivalDate: z.string().optional(),
  intendedDepartureDate: z.string().optional(),
  lastName: z.string().optional(),
  nationalityCountryCode: z.string().optional(),
  passportCountryCode: z.string().optional(),
  passportExpiresOn: z.string().optional(),
  passportIssuedOn: z.string().optional(),
  passportNumber: z.string().optional(),
  phone: z.string().optional(),
  purposeOfTravel: z.enum(VISA_PURPOSES).optional(),
  purposeOfTravelDetails: z.string().optional(),
  residencyAddressLine1: z.string().optional(),
  residencyAddressLine2: z.string().optional(),
  residencyCity: z.string().optional(),
  residencyCountryCode: z.string().optional(),
  residencyStatus: z.enum(VISA_RESIDENCY_STATUSES).optional(),
  visaType: z.enum(VISA_PRODUCT_TYPES).optional()
});

export function parseVisaDraftValues(input: unknown): VisaApplicationDraftValues {
  return visaApplicationDraftSchema.parse(input);
}

export function parseVisaApplicationMutationPayload(input: unknown) {
  return z
    .object({
      action: z.enum(["save_draft", "submit"]),
      formData: z.unknown(),
      locale: z.enum(locales)
    })
    .parse(input);
}

export function parseVisaApplicationFormValues(
  input: unknown,
  messages: VisaApplicationMessages = defaultVisaApplicationMessages
) {
  return createVisaApplicationSchema(messages).parse(input);
}

export const VISA_COUNTRY_CODES = VISA_COUNTRY_OPTIONS.map((option) => option.code);
