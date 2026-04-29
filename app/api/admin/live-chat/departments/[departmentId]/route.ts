import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {liveChatDepartmentSchema} from "@/features/live-chat/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {errorResponse} from "@/server/live-chat/http";
import {saveLiveChatDepartment} from "@/server/live-chat/service";

export async function PATCH(
  request: Request,
  {params}: {params: {departmentId: string}}
) {
  try {
    const actor = await requireAdminApiUser("support.reply");
    const input = liveChatDepartmentSchema.parse(await request.json());

    await saveLiveChatDepartment({
      actor,
      departmentId: params.departmentId,
      input
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid department."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to update department.");
  }
}
