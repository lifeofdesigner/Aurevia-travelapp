import "server-only";

import {NextResponse} from "next/server";

import {createSupabaseServerClient} from "@/lib/supabase/server";

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function getLiveChatToken(request: Request) {
  return request.headers.get("x-live-chat-token") ?? "";
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent");
}

function getErrorCauseCode(error: unknown) {
  if (!(error instanceof Error) || !("cause" in error)) {
    return null;
  }

  const cause = error.cause;

  if (!cause || typeof cause !== "object" || !("code" in cause)) {
    return null;
  }

  const code = cause.code;
  return typeof code === "string" ? code : null;
}

export function isRecoverableLiveChatBackendError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const causeCode = getErrorCauseCode(error);

  return (
    error.name === "AuthRetryableFetchError" ||
    message.includes("fetch failed") ||
    causeCode === "ENOTFOUND" ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    causeCode === "ECONNRESET" ||
    causeCode === "ETIMEDOUT"
  );
}

export async function getOptionalUserId() {
  const supabase = createSupabaseServerClient();
  const result = await supabase.auth.getUser();

  return result.data.user?.id ?? null;
}

export function errorResponse(error: unknown, fallback: string) {
  const isRecoverableBackendError = isRecoverableLiveChatBackendError(error);
  const message = isRecoverableBackendError
    ? fallback
    : error instanceof Error
      ? error.message
      : fallback;
  const status = isRecoverableBackendError
    ? 503
    : message === "Unauthorized."
    ? 401
    : message === "Forbidden."
      ? 403
      : message.includes("not found")
        ? 404
        : 400;

  return jsonResponse({message}, {status});
}
