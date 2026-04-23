import "server-only";

import {z} from "zod";

import {publicEnvSchema} from "@/lib/env/client";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  STRIPE_SECRET_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  STRIPE_WEBHOOK_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  RESEND_API_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  EMAIL_FROM: z.preprocess(
    emptyStringToUndefined,
    z.string().min(3).default("Aurevia Travel <bookings@aurevia.example>")
  )
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ServerEnvKey = keyof ServerEnv;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  return parsed.data;
}

export function requireServerEnv<K extends ServerEnvKey>(
  key: K
): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];

  if (!value) {
    throw new Error(`${key} must be configured for this server operation.`);
  }

  return value as NonNullable<ServerEnv[K]>;
}
