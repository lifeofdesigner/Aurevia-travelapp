import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {
  parseAdminDeleteBody,
  isAdminResourceKey,
  parseAdminMutationBody,
  parseAdminResourceInput
} from "@/features/admin/lib/schemas";
import {getAdminResourcePermission} from "@/features/admin/lib/admin-resource-permissions";
import {type AdminResourceKey} from "@/features/admin/types";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {
  deleteAdminResourceRecord,
  saveAdminResourceRecord
} from "@/server/admin/mutation-service";

function getRequiredPermission(resource: AdminResourceKey) {
  if (resource === "customers") {
    return "customers.edit" as const;
  }

  return getAdminResourcePermission(resource);
}

function revalidateAdminResourcePaths(resource: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/${resource}`);
    if (resource === "customers") {
      revalidatePath(`/${locale}/admin/customers`);
    }

    if (resource === "destinations" || resource === "featured-content") {
      revalidatePath(`/${locale}`);
    }

    if (resource === "legal") {
      revalidatePath(`/${locale}/privacy`);
      revalidatePath(`/${locale}/terms`);
      revalidatePath(`/${locale}/cookies`);
      revalidatePath(`/${locale}/refunds`);
    }
  }
}

export async function POST(
  request: Request,
  {params}: {params: {resource: string}}
) {
  try {
    if (!isAdminResourceKey(params.resource)) {
      return NextResponse.json({message: "Unknown admin resource."}, {status: 404});
    }

    const actor = await requireAdminApiUser(getRequiredPermission(params.resource));
    const body = parseAdminMutationBody(await request.json());
    const values = parseAdminResourceInput(params.resource, body.values);

    const result = await saveAdminResourceRecord({
      actor,
      resource: params.resource,
      values
    });

    revalidateAdminResourcePaths(params.resource);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid admin request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save admin resource.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

export async function PATCH(
  request: Request,
  {params}: {params: {resource: string}}
) {
  try {
    if (!isAdminResourceKey(params.resource)) {
      return NextResponse.json({message: "Unknown admin resource."}, {status: 404});
    }

    const actor = await requireAdminApiUser(getRequiredPermission(params.resource));
    const body = parseAdminMutationBody(await request.json());

    if (!body.id) {
      return NextResponse.json({message: "The resource id is required."}, {status: 400});
    }

    const values = parseAdminResourceInput(params.resource, body.values);
    const result = await saveAdminResourceRecord({
      actor,
      id: body.id,
      resource: params.resource,
      values
    });

    revalidateAdminResourcePaths(params.resource);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid admin request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update admin resource.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

export async function DELETE(
  request: Request,
  {params}: {params: {resource: string}}
) {
  try {
    if (!isAdminResourceKey(params.resource)) {
      return NextResponse.json({message: "Unknown admin resource."}, {status: 404});
    }

    if (params.resource === "customers") {
      return NextResponse.json(
        {message: "Customer records cannot be deleted from this panel."},
        {status: 405}
      );
    }

    const actor = await requireAdminApiUser(getRequiredPermission(params.resource));
    const body = parseAdminDeleteBody(await request.json());

    await deleteAdminResourceRecord({
      actor,
      id: body.id,
      resource: params.resource
    });

    revalidateAdminResourcePaths(params.resource);

    return NextResponse.json({ok: true});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete admin resource.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
