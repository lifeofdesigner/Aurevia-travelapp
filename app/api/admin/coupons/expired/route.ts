import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {deleteExpiredCoupons} from "@/server/admin/mutation-service";

export async function POST() {
  try {
    const actor = await requireAdminApiUser("coupons.manage");
    const result = await deleteExpiredCoupons({actor});

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin`);
      revalidatePath(`/${locale}/admin/coupons`);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete expired coupons.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
