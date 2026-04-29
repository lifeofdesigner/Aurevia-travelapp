import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminVisaReviewInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateVisaApplicationReview} from "@/server/admin/mutation-service";

export async function PATCH(
  request: Request,
  {params}: {params: {applicationId: string}}
) {
  try {
    const actor = await requireAdminApiUser("visa.review");
    const input = parseAdminVisaReviewInput(await request.json());

    await updateVisaApplicationReview({
      actor,
      applicationId: params.applicationId,
      reviewedAt: input.reviewedAt,
      status: input.status
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/visa-review`);
      revalidatePath(`/${locale}/admin/visa-review/${params.applicationId}`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid visa review update."},
        {status: 400}
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to update the visa application.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
