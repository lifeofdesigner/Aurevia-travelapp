import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {updateManagedUser} from "@/server/admin/control-center-service";

const updateAdminUserSchema = z.object({
  isActive: z.boolean(),
  role: z.enum(["customer", "super_admin", "admin", "agent", "support"])
});

export async function PATCH(
  request: Request,
  {params}: {params: {userId: string}}
) {
  try {
    const actor = await requireAdminApiUser("admin_users.manage");
    const input = updateAdminUserSchema.parse(await request.json());

    await updateManagedUser({
      actor,
      isActive: input.isActive,
      role: input.role,
      userId: params.userId
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/users`);
      revalidatePath(`/${locale}/admin/customers`);
      revalidatePath(`/${locale}/admin/customers/${params.userId}`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid admin user update."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update the admin user.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
