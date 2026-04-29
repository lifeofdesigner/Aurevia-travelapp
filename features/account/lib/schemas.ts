import {z} from "zod";

import {locales} from "@/lib/i18n/routing";
import {SUPPORTED_CURRENCIES} from "@/lib/money";

import {TRAVELER_DOCUMENT_TYPES, TRAVELER_PROFILE_TYPES} from "../types";

type ProfileSchemaMessages = {
  addressCityRequired: string;
  addressCountryRequired: string;
  addressLineRequired: string;
  dateInvalid: string;
  firstNameTooLong: string;
  lastNameTooLong: string;
  phoneInvalid: string;
};

type TravelerSchemaMessages = {
  documentLast4Invalid: string;
  documentTypeRequired: string;
  emailInvalid: string;
  expiresAfterIssued: string;
  firstNameRequired: string;
  firstNameTooLong: string;
  lastNameRequired: string;
  lastNameTooLong: string;
  notesTooLong: string;
  phoneInvalid: string;
};

const defaultProfileSchemaMessages: ProfileSchemaMessages = {
  addressCityRequired: "Enter the billing city.",
  addressCountryRequired: "Choose the billing country.",
  addressLineRequired: "Enter the billing address line.",
  dateInvalid: "Enter a valid date.",
  firstNameTooLong: "First name must be 80 characters or less.",
  lastNameTooLong: "Last name must be 80 characters or less.",
  phoneInvalid: "Enter a valid phone number."
};

const defaultTravelerSchemaMessages: TravelerSchemaMessages = {
  documentLast4Invalid: "Enter up to 4 letters or numbers.",
  documentTypeRequired: "Choose a document type before saving document metadata.",
  emailInvalid: "Enter a valid email address.",
  expiresAfterIssued: "Document expiry must be after the issue date.",
  firstNameRequired: "Enter the traveler's first name.",
  firstNameTooLong: "First name must be 80 characters or less.",
  lastNameRequired: "Enter the traveler's last name.",
  lastNameTooLong: "Last name must be 80 characters or less.",
  notesTooLong: "Special assistance notes must be 500 characters or less.",
  phoneInvalid: "Enter a valid phone number."
};

function optionalDateSchema(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || !Number.isNaN(Date.parse(value)), {
      message
    });
}

function optionalPhoneSchema(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^[+0-9()\-\s]{7,20}$/u.test(value), {
      message
    });
}

export function createProfileSettingsSchema(
  messages: ProfileSchemaMessages = defaultProfileSchemaMessages
) {
  return z
    .object({
      billingAddressCityName: z.string().trim(),
      billingAddressCompanyName: z.string().trim(),
      billingAddressCountryCode: z.string().trim(),
      billingAddressLine1: z.string().trim(),
      billingAddressLine2: z.string().trim(),
      billingAddressPostalCode: z.string().trim(),
      billingAddressRecipientName: z.string().trim(),
      billingAddressStateRegion: z.string().trim(),
      billingAddressVatNumber: z.string().trim(),
      dateOfBirth: optionalDateSchema(messages.dateInvalid),
      firstName: z.string().trim().max(80, messages.firstNameTooLong),
      lastName: z.string().trim().max(80, messages.lastNameTooLong),
      marketingEmailOptIn: z.boolean(),
      phone: optionalPhoneSchema(messages.phoneInvalid),
      preferredCurrency: z.enum(SUPPORTED_CURRENCIES),
      preferredLocale: z.enum(locales)
    })
    .superRefine((value, context) => {
      const hasAnyAddressField = [
        value.billingAddressLine1,
        value.billingAddressLine2,
        value.billingAddressCityName,
        value.billingAddressStateRegion,
        value.billingAddressPostalCode,
        value.billingAddressCountryCode,
        value.billingAddressCompanyName,
        value.billingAddressRecipientName,
        value.billingAddressVatNumber
      ].some((entry) => entry.length > 0);

      if (!hasAnyAddressField) {
        return;
      }

      if (!value.billingAddressLine1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.addressLineRequired,
          path: ["billingAddressLine1"]
        });
      }

      if (!value.billingAddressCityName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.addressCityRequired,
          path: ["billingAddressCityName"]
        });
      }

      if (!value.billingAddressCountryCode) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.addressCountryRequired,
          path: ["billingAddressCountryCode"]
        });
      }
    });
}

export function createTravelerProfileSchema(
  messages: TravelerSchemaMessages = defaultTravelerSchemaMessages
) {
  return z
    .object({
      dateOfBirth: optionalDateSchema(messages.expiresAfterIssued),
      documentNumberLast4: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || /^[A-Za-z0-9]{1,4}$/u.test(value), {
          message: messages.documentLast4Invalid
        }),
      documentType: z.union([z.literal(""), z.enum(TRAVELER_DOCUMENT_TYPES)]),
      email: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
          message: messages.emailInvalid
        }),
      expiresAt: optionalDateSchema(messages.expiresAfterIssued),
      firstName: z
        .string()
        .trim()
        .min(1, messages.firstNameRequired)
        .max(80, messages.firstNameTooLong),
      gender: z.string().trim(),
      isPrimary: z.boolean(),
      issuedAt: optionalDateSchema(messages.expiresAfterIssued),
      issuingCountryCode: z.string().trim(),
      lastName: z
        .string()
        .trim()
        .min(1, messages.lastNameRequired)
        .max(80, messages.lastNameTooLong),
      middleName: z.string().trim(),
      nationalityCountryCode: z.string().trim(),
      phone: optionalPhoneSchema(messages.phoneInvalid),
      relationshipLabel: z.string().trim(),
      residenceCountryCode: z.string().trim(),
      specialAssistanceNotes: z.string().trim().max(500, messages.notesTooLong),
      travelerType: z.enum(TRAVELER_PROFILE_TYPES)
    })
    .superRefine((value, context) => {
      const hasAnyDocumentField = [
        value.documentNumberLast4,
        value.expiresAt,
        value.issuedAt,
        value.issuingCountryCode
      ].some((entry) => entry.length > 0);

      if (hasAnyDocumentField && !value.documentType) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.documentTypeRequired,
          path: ["documentType"]
        });
      }

      if (
        value.issuedAt &&
        value.expiresAt &&
        !Number.isNaN(Date.parse(value.issuedAt)) &&
        !Number.isNaN(Date.parse(value.expiresAt)) &&
        new Date(value.expiresAt) <= new Date(value.issuedAt)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.expiresAfterIssued,
          path: ["expiresAt"]
        });
      }
    });
}

export function parseProfileSettingsInput(input: unknown) {
  return createProfileSettingsSchema().parse(input);
}

export function parseTravelerProfileInput(input: unknown) {
  return createTravelerProfileSchema().parse(input);
}
