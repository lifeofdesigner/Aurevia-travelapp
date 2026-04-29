import "server-only";

import crypto from "node:crypto";

import {type Json} from "@/types/supabase";

export type PrivacyRequestContext = {
  ipHash: string | null;
  userAgent: string | null;
};

export function asJsonRecord(value: Record<string, unknown>) {
  return value as Record<string, Json | string | number | boolean | null>;
}

export function asRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function hashValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getPrivacyRequestContext(request: Request): PrivacyRequestContext {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  return {
    ipHash: hashValue(ipAddress),
    userAgent: request.headers.get("user-agent")
  };
}

export function toTerminalDataRequestTimestamp(status: string) {
  return ["fulfilled", "rejected", "cancelled"].includes(status)
    ? new Date().toISOString()
    : null;
}
