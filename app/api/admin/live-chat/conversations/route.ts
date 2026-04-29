import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {listLiveChatConversations} from "@/server/live-chat/service";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminApiUser("support.view");
    const url = new URL(request.url);
    const conversations = await listLiveChatConversations({
      actor,
      assigned: (url.searchParams.get("assigned") as "all" | "me" | "unassigned" | null) ?? "all",
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined
    });

    return NextResponse.json({conversations});
  } catch (error) {
    return errorResponse(error, "Unable to load live chat conversations.");
  }
}
