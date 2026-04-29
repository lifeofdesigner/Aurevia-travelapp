import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminCustomerStateInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateAdminCustomerSuspension} from "@/server/admin/customers-manager-service";

export async function PATCH(
  request: Request,
  {params}: {params: {userId: string}}
) {
  try {
    const actor = await requireAdminApiUser("customers.edit");
    const input = parseAdminCustomerStateInput(await request.json());

    await updateAdminCustomerSuspension({
      actor,
      isSuspended: input.isSuspended,
      userId: params.userId
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/customers`);
      revalidatePath(`/${locale}/admin/customers/${params.userId}`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid customer update."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update the customer.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
