import {NextResponse} from "next/server";

import {parseAdminDataRequestInput} from "@/features/admin/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateAdminDataRequest} from "@/server/privacy/data-request-service";

type RouteContext = {
  params: {
    requestId: string;
  };
};

export async function PATCH(request: Request, {params}: RouteContext) {
  try {
    const actor = await requireAdminApiUser("settings.manage");
    const input = parseAdminDataRequestInput(await request.json());

    await updateAdminDataRequest({
      actor,
      assignedAdminUserId: input.assignedAdminUserId,
      rejectedReason: input.rejectedReason,
      requestId: params.requestId,
      responseSummary: input.responseSummary,
      status: input.status
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to update the data request."
      },
      {status: 400}
    );
  }
}
