import {NextResponse} from "next/server";

import {
  getClientIp,
  getLiveChatToken,
  getOptionalUserId,
  getUserAgent,
  errorResponse
} from "@/server/live-chat/http";
import {getLiveChatPublicConfig} from "@/server/live-chat/service";

export async function GET(request: Request) {
  try {
    const token = getLiveChatToken(request);
    const userId = await getOptionalUserId();
    const config = await getLiveChatPublicConfig({
      ip: getClientIp(request),
      token,
      userAgent: getUserAgent(request),
      userId
    });

    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error, "Unable to load live chat.");
  }
}
