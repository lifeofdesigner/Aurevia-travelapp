import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {ADMIN_INTEGRATION_KEYS} from "@/features/admin/lib/control-center-types";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {testAdminIntegrationConnection} from "@/server/admin/control-center-service";

export async function POST(
  _request: Request,
  {params}: {params: {integrationKey: string}}
) {
  try {
    const actor = await requireAdminApiUser("integrations.manage");
    const integrationKey = z.enum(ADMIN_INTEGRATION_KEYS).parse(params.integrationKey);
    const result = await testAdminIntegrationConnection({
      actor,
      key: integrationKey
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/integrations`);
    }

    return NextResponse.json({
      message: result.message,
      ok: result.status === "connected"
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid integration test request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to test the integration.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
