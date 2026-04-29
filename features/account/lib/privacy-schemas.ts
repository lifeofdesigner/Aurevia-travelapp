import {z} from "zod";

import {locales} from "@/lib/i18n/routing";

type PrivacyRequestSchemaMessages = {
  detailsTooLong: string;
  requestTypeRequired: string;
};

const defaultPrivacyRequestSchemaMessages: PrivacyRequestSchemaMessages = {
  detailsTooLong: "Keep the request details within 1000 characters.",
  requestTypeRequired: "Choose a privacy request type."
};

export const privacyPreferencesSchema = z.object({
  analyticsCookies: z.boolean(),
  locale: z.enum(locales),
  marketingCookies: z.boolean(),
  marketingEmailOptIn: z.boolean(),
  profilingOptIn: z.boolean(),
  sessionId: z.string().trim().min(1).optional()
});

export const cookieConsentSchema = z.object({
  analyticsCookies: z.boolean(),
  locale: z.enum(locales),
  marketingCookies: z.boolean(),
  sessionId: z.string().trim().min(1)
});

export function createPrivacyDataRequestSchema(
  messages: PrivacyRequestSchemaMessages = defaultPrivacyRequestSchemaMessages
) {
  return z.object({
    details: z.string().trim().max(1000, messages.detailsTooLong),
    requestType: z.enum(["erasure", "portability"], {
      message: messages.requestTypeRequired
    })
  });
}

export function parsePrivacyPreferencesInput(input: unknown) {
  return privacyPreferencesSchema.parse(input);
}

export function parseCookieConsentInput(input: unknown) {
  return cookieConsentSchema.parse(input);
}

export function parsePrivacyDataRequestInput(input: unknown) {
  return createPrivacyDataRequestSchema().parse(input);
}
