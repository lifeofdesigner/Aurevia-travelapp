import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {parseAdminNoteInput} from "@/features/admin/lib/schemas";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {createBookingAdminNote} from "@/server/admin/mutation-service";

export async function POST(request: Request) {
  try {
    const input = parseAdminNoteInput(await request.json());
    const actor = await requireAdminApiUser(
      input.entityType === "booking"
        ? "bookings.edit"
        : input.entityType === "customer"
          ? "customers.edit"
          : input.entityType === "support_ticket"
            ? "support.reply"
            : "visa.review"
    );
    await createBookingAdminNote({
      actor,
      entityId: input.entityId,
      entityType: input.entityType,
      isVisibleToCustomer: input.isVisibleToCustomer,
      noteBody: input.noteBody,
      title: input.title
    });

    for (const locale of locales) {
      revalidatePath(`/${locale}/admin/bookings`);
      if (input.entityId && input.entityType === "booking") {
        revalidatePath(`/${locale}/admin/bookings/${input.entityId}`);
      }
      if (input.entityId && input.entityType === "support_ticket") {
        revalidatePath(`/${locale}/admin/support`);
        revalidatePath(`/${locale}/admin/support/${input.entityId}`);
      }
      if (input.entityId && input.entityType === "customer") {
        revalidatePath(`/${locale}/admin/customers`);
        revalidatePath(`/${locale}/admin/customers/${input.entityId}`);
      }
      if (input.entityId && input.entityType === "visa_application") {
        revalidatePath(`/${locale}/admin/visa-review`);
        revalidatePath(`/${locale}/admin/visa-review/${input.entityId}`);
      }
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid admin note."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save admin note.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
