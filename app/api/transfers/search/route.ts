import {createHash} from "crypto";

import {type NextRequest, NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseTransferSearchCriteria} from "@/features/transfers/lib/schemas";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {searchTransfers} from "@/server/transfers/search-service";

function getIpHash(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return undefined;
  }

  const rawIp = forwardedFor.split(",")[0]?.trim();

  if (!rawIp) {
    return undefined;
  }

  return createHash("sha256").update(rawIp).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const criteria = parseTransferSearchCriteria(request.nextUrl.searchParams);
    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const existingSessionId = request.cookies.get("aurevia_session_id")?.value;
    const sessionId = existingSessionId ?? crypto.randomUUID();
    const searchResponse = await searchTransfers(criteria, {
      ipHash: getIpHash(request),
      sessionId,
      userAgent: request.headers.get("user-agent") ?? undefined,
      userId: userResponse.data.user?.id
    });
    const response = NextResponse.json(searchResponse);

    if (!existingSessionId) {
      response.cookies.set("aurevia_session_id", sessionId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax"
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid transfer search parameters."
        },
        {status: 400}
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to search transfers right now."
      },
      {status: 500}
    );
  }
}
