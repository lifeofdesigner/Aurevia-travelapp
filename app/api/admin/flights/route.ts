import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {requireAdminApiUser} from "@/server/admin/auth";
import {saveAdminFlightsManagerSection} from "@/server/admin/flights-manager-service";

const featuredRouteSchema = z.object({
  destinationCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  label: z.string().trim().min(1),
  originCode: z.string().trim().length(3).transform((value) => value.toUpperCase())
});

const markupRuleSchema = z.object({
  airlineCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  airlineName: z.string().trim().nullable(),
  destinationCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  markupPercent: z.number().min(0).max(100),
  originCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  scope: z.enum(["airline", "route"])
});

const airlineVisibilitySchema = z.object({
  airlineCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  airlineName: z.string().trim().min(1),
  id: z.string().trim().min(1),
  isHidden: z.boolean()
});

const baggageOverrideSchema = z.object({
  airlineCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  airlineName: z.string().trim().nullable(),
  destinationCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  message: z.string().trim().min(1),
  originCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .nullable(),
  scope: z.enum(["airline", "route"])
});

const requestSchema = z.discriminatedUnion("section", [
  z.object({
    items: z.array(featuredRouteSchema),
    section: z.literal("featuredRoutes")
  }),
  z.object({
    items: z.array(markupRuleSchema),
    section: z.literal("markupRules")
  }),
  z.object({
    items: z.array(airlineVisibilitySchema),
    section: z.literal("airlineVisibility")
  }),
  z.object({
    items: z.array(baggageOverrideSchema),
    section: z.literal("baggageOverrides")
  })
]);

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("flights.manage");
    const body = requestSchema.parse(await request.json());
    const items = await saveAdminFlightsManagerSection({
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
        {message: error.issues[0]?.message ?? "Invalid flight admin request."},
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save flight admin data.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
