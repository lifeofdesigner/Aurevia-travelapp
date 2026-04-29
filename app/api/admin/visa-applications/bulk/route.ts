import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminVisaBulkReviewInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {bulkReviewVisaApplications} from "@/server/admin/visa-review-service";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("visa.review");
    const input = parseAdminVisaBulkReviewInput(await request.json());

    await bulkReviewVisaApplications({
      actor,
      applicationIds: input.applicationIds,
      status: input.status
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/visa-review`);
      for (const applicationId of input.applicationIds) {
        revalidatePath(`/${locale}/admin/visa-review/${applicationId}`);
      }
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid bulk visa review request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update visa applications.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
