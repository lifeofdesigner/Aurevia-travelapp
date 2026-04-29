import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import type {SupportedCurrency} from "@/lib/money";
import {locales} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {
  deleteHomepageRecord,
  reorderHomepageRecords,
  saveHomepageBanner,
  saveHomepageDeal,
  saveHomepageDestination,
  saveHomepageHero,
  saveHomepageSettings
} from "@/server/homepage/admin-service";

const heroSchema = z.object({
  bgImageUrl: z.string().trim().nullable(),
  ctaLink: z.string().trim().min(1, "CTA link is required."),
  ctaText: z.string().trim().min(1, "CTA text is required."),
  headline: z.string().trim().min(1, "Headline is required."),
  id: z.string().uuid().nullable().optional(),
  subheadline: z.string().trim().min(1, "Subheadline is required.")
});

const bannerSchema = z.object({
  ctaLink: z.string().trim().nullable(),
  ctaText: z.string().trim().nullable(),
  endsAt: z.string().trim().nullable(),
  id: z.string().uuid().optional(),
  imageUrl: z.string().trim().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  startsAt: z.string().trim().nullable(),
  subtitle: z.string().trim().nullable(),
  title: z.string().trim().min(1, "Banner title is required.")
});

const destinationSchema = z.object({
  city: z.string().trim().min(1, "City is required."),
  country: z.string().trim().min(1, "Country is required."),
  hotelsCount: z.number().int().nonnegative().nullable(),
  id: z.string().uuid().optional(),
  imageUrl: z.string().trim().nullable(),
  isActive: z.boolean(),
  link: z.string().trim().nullable(),
  priceLabel: z.string().trim().nullable(),
  sortOrder: z.number().int().nonnegative()
});

const dealSchema = z.object({
  airlineName: z.string().trim().min(1, "Airline name is required."),
  currency: z.enum(["EUR", "USD", "GBP", "AED", "NGN"]) as z.ZodType<SupportedCurrency>,
  destinationCity: z.string().trim().min(1, "Destination city is required."),
  destinationCode: z
    .string()
    .trim()
    .min(3, "Destination code is required.")
    .transform((value) => value.toUpperCase()),
  expiresAt: z.string().trim().nullable(),
  fareType: z.string().trim().nullable(),
  id: z.string().uuid().optional(),
  imageUrl: z.string().trim().nullable(),
  isActive: z.boolean(),
  originCity: z.string().trim().min(1, "Origin city is required."),
  originCode: z
    .string()
    .trim()
    .min(3, "Origin code is required.")
    .transform((value) => value.toUpperCase()),
  price: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative()
});

const settingsSchema = z.object({
  ctaDescription: z.string().trim(),
  ctaHeadline: z.string().trim(),
  footerTagline: z.string().trim(),
  stats: z
    .array(
      z.object({
        label: z.string().trim(),
        value: z.string().trim()
      })
    )
    .length(3),
  trustItems: z.array(z.string().trim()).length(5),
  whyDescription: z.string().trim(),
  whyHeadline: z.string().trim()
});

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().nonnegative()
    })
  ),
  section: z.enum(["banners", "deals", "destinations"])
});

const deleteSchema = z.object({
  id: z.string().uuid(),
  section: z.enum(["banners", "deals", "destinations"])
});

const requestSchema = z.union([
  z.object({
    action: z.literal("save"),
    payload: heroSchema,
    section: z.literal("hero")
  }),
  z.object({
    action: z.literal("save"),
    payload: bannerSchema,
    section: z.literal("banners")
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
    section: z.literal("banners")
  }),
  z.object({
    action: z.literal("reorder"),
    items: reorderSchema.shape.items,
    section: z.literal("banners")
  }),
  z.object({
    action: z.literal("save"),
    payload: destinationSchema,
    section: z.literal("destinations")
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
    section: z.literal("destinations")
  }),
  z.object({
    action: z.literal("reorder"),
    items: reorderSchema.shape.items,
    section: z.literal("destinations")
  }),
  z.object({
    action: z.literal("save"),
    payload: dealSchema,
    section: z.literal("deals")
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
    section: z.literal("deals")
  }),
  z.object({
    action: z.literal("reorder"),
    items: reorderSchema.shape.items,
    section: z.literal("deals")
  }),
  z.object({
    action: z.literal("save"),
    payload: settingsSchema,
    section: z.literal("settings")
  })
]);

function revalidateHomepagePaths() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/homepage`);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiUser("homepage.manage");
    const body = requestSchema.parse(await request.json());

    if (body.section === "hero") {
      const hero = await saveHomepageHero(actor, body.payload);
      revalidateHomepagePaths();
      return NextResponse.json({hero});
    }

    if (body.section === "settings") {
      const settings = await saveHomepageSettings(actor, body.payload);
      revalidateHomepagePaths();
      return NextResponse.json({settings});
    }

    if (body.action === "delete") {
      const payload = deleteSchema.parse(body);
      await deleteHomepageRecord({
        actor,
        id: payload.id,
        section: payload.section
      });
      revalidateHomepagePaths();
      return NextResponse.json({ok: true});
    }

    if (body.action === "reorder") {
      const payload = reorderSchema.parse(body);
      await reorderHomepageRecords({
        actor,
        items: payload.items,
        section: payload.section
      });
      revalidateHomepagePaths();
      return NextResponse.json({ok: true});
    }

    if (body.section === "banners") {
      const banner = await saveHomepageBanner(actor, body.payload);
      revalidateHomepagePaths();
      return NextResponse.json({banner});
    }

    if (body.section === "destinations") {
      const destination = await saveHomepageDestination(actor, body.payload);
      revalidateHomepagePaths();
      return NextResponse.json({destination});
    }

    const deal = await saveHomepageDeal(actor, body.payload);
    revalidateHomepagePaths();
    return NextResponse.json({deal});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid homepage admin request."
        },
        {status: 400}
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save homepage content.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}
