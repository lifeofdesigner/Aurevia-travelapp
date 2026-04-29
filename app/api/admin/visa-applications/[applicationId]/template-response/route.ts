import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminVisaTemplateResponseInput} from "@/features/admin/lib/schemas";
import {requireAdminApiUser} from "@/server/admin/auth";
import {sendVisaTemplateResponse} from "@/server/admin/visa-review-service";

export async function POST(
  request: Request,
  {params}: {params: {applicationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("visa.review");
    const input = parseAdminVisaTemplateResponseInput(await request.json());

    await sendVisaTemplateResponse({
      actor,
      applicationId: params.applicationId,
      customMessage: input.customMessage,
      templateKey: input.templateKey
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid visa template response."},
        {status: 400}
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to send the visa template response.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
