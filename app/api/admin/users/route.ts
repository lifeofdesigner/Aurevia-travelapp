import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {createManagedUser} from "@/server/admin/control-center-service";

const managedUserRoleSchema = z.enum([
  "customer",
  "super_admin",
  "admin",
  "agent",
  "support"
]);

const createManagedUserSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  password: z.string().min(8),
  phone: z.string().trim().optional().nullable(),
  role: managedUserRoleSchema
});

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("admin_users.manage");
    const input = createManagedUserSchema.parse(await request.json());

    const result = await createManagedUser({
      actor,
      email: input.email,
      fullName: input.fullName,
      password: input.password,
      phone: input.phone,
      role: input.role
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/users`);
      revalidatePath(`/${locale}/admin/customers`);
    }

    return NextResponse.json({ok: true, userId: result.userId});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid user creation request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to create the user.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
