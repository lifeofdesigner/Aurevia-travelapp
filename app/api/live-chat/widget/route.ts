import {NextResponse} from "next/server";

import {
  getClientIp,
  getLiveChatToken,
  getOptionalUserId,
  getUserAgent,
  errorResponse,
  isRecoverableLiveChatBackendError
} from "@/server/live-chat/http";
import {getLiveChatPublicConfig} from "@/server/live-chat/service";
import {type LiveChatPublicConfig} from "@/lib/live-chat/types";

const unavailableConfig: LiveChatPublicConfig = {
  activeConversationId: null,
  businessHoursAvailable: false,
  departments: [],
  onlineAgentCount: 0,
  settings: {
    aiEnabled: false,
    aiSuggestionsEnabled: false,
    allowAttachments: false,
    autoAssignmentEnabled: false,
    brandColor: "#1c3d2e",
    browserNotificationsEnabled: false,
    businessHoursEnabled: false,
    csatEnabled: false,
    defaultDepartmentId: null,
    maxAttachmentSizeMb: 5,
    offlineMessage: "Live chat is temporarily unavailable.",
    proactiveChatEnabled: false,
    requirePrechatEmail: true,
    soundEnabled: false,
    transcriptEnabled: false,
    typicalReplyMinutes: 15,
    welcomeMessage: "Live chat is temporarily unavailable.",
    widgetEnabled: false,
    widgetPosition: "bottom-right"
  },
  visitor: {
    email: null,
    name: null
  }
};

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
    if (isRecoverableLiveChatBackendError(error)) {
      console.error("Live chat widget backend unavailable.", error);

      return NextResponse.json(unavailableConfig);
    }

    return errorResponse(error, "Unable to load live chat.");
  }
}
