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

export async function getOptionalUserId() {
  const supabase = createSupabaseServerClient();
  const result = await supabase.auth.getUser();

  return result.data.user?.id ?? null;
}

export function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Unauthorized."
    ? 401
    : message === "Forbidden."
      ? 403
      : message.includes("not found")
        ? 404
        : 400;

  return jsonResponse({message}, {status});
}
