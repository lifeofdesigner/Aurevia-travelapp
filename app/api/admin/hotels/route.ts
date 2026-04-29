import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {requireAdminApiUser} from "@/server/admin/auth";
import {saveAdminHotelsManagerSection} from "@/server/admin/hotels-manager-service";

const featuredPropertySchema = z.object({
  cityName: z.string().trim().nullable(),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  label: z.string().trim().min(1),
  propertyName: z.string().trim().min(1)
});

const markupRuleSchema = z.object({
  cityName: z.string().trim().nullable(),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  markupPercent: z.number().min(0).max(100),
  propertyName: z.string().trim().nullable(),
  scope: z.enum(["city", "property"])
});

const hiddenPropertySchema = z.object({
  cityName: z.string().trim().nullable(),
  id: z.string().trim().min(1),
  isHidden: z.boolean(),
  propertyName: z.string().trim().min(1)
});

const requestSchema = z.discriminatedUnion("section", [
  z.object({
    items: z.array(featuredPropertySchema),
    section: z.literal("featuredProperties")
  }),
  z.object({
    items: z.array(markupRuleSchema),
    section: z.literal("markupRules")
  }),
  z.object({
    items: z.array(hiddenPropertySchema),
    section: z.literal("hiddenProperties")
  })
]);

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("hotels.manage");
    const body = requestSchema.parse(await request.json());
    const items = await saveAdminHotelsManagerSection({
      actor,
      items: body.items,
      section: body.section
    });

    return NextResponse.json({
      items,
      section: body.section
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid hotel admin request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save hotel admin data.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
