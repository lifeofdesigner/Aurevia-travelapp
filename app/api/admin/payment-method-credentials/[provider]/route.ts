import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {saveAdminPaymentProviderCredentialSetting} from "@/server/admin/control-center-service";

const paymentCredentialUpdateSchema = z.object({
  environment: z.enum(["live", "test"]),
  secretValues: z.record(z.string(), z.string())
});

const configurablePaymentProviderSchema = z.enum([
  "stripe",
  "paystack",
  "flutterwave",
  "korapay"
]);

export async function PATCH(
  request: Request,
  {params}: {params: {provider: string}}
) {
  try {
    const actor = await requireAdminApiUser("settings.manage");
    const provider = configurablePaymentProviderSchema.parse(params.provider);
    const input = paymentCredentialUpdateSchema.parse(await request.json());

    await saveAdminPaymentProviderCredentialSetting({
      actor,
      environment: input.environment,
      key: provider,
      secretValues: input.secretValues
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/settings`);
      revalidatePath(`/${locale}/admin/integrations`);
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid payment credential update."},
        {status: 400}
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to update payment credentials.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
