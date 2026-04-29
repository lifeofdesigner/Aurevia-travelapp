import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {ADMIN_INTEGRATION_KEYS} from "@/features/admin/lib/control-center-types";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {saveAdminIntegrationSetting} from "@/server/admin/control-center-service";

const integrationUpdateSchema = z.object({
  environment: z.enum(["live", "test"]),
  provider: z.union([z.enum(["resend", "sendgrid"]), z.null()]).optional().transform((value) => value ?? null),
  secretValues: z.record(z.string(), z.string())
});

export async function PATCH(
  request: Request,
  {params}: {params: {integrationKey: string}}
) {
  try {
    const actor = await requireAdminApiUser("integrations.manage");
    const integrationKey = z.enum(ADMIN_INTEGRATION_KEYS).parse(params.integrationKey);
    const input = integrationUpdateSchema.parse(await request.json());

    await saveAdminIntegrationSetting({
      actor,
      environment: input.environment,
      key: integrationKey,
      provider: input.provider,
      secretValues: input.secretValues
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/integrations`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid integration update."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update the integration.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
