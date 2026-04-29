import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {inviteAdminUser} from "@/server/admin/control-center-service";

const inviteAdminUserSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "owner", "support"])
});

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("admin_users.manage");
    const input = inviteAdminUserSchema.parse(await request.json());

    await inviteAdminUser({
      actor,
      email: input.email,
      role: input.role
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/users`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid admin invite."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to invite the admin user.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
