import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {findVisaCountryOptionByQuery} from "@/features/visa/lib/catalog";
import {VISA_PRODUCT_TYPES} from "@/features/visa/types";
import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {createVisaApplicationDraft} from "@/server/visa/application-service";
import {
  getVisaApplicationForUser,
  listVisaApplicationsForUser
} from "@/server/visa/query-service";

const createVisaApplicationBodySchema = z.object({
  nationalityCountryCode: z.string().trim().optional(),
  travelDate: z.string().trim().optional(),
  visaCountryCode: z.string().trim().min(2, "Choose a destination country."),
  visaType: z.enum(VISA_PRODUCT_TYPES).optional()
});

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  applyPrivateRouteHeaders(response.headers);
  return response;
}

function normalizeCountryCode(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return findVisaCountryOptionByQuery(value)?.code ?? value.trim().toUpperCase();
}

async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();

  return userResult.data.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateJson({message: "Unauthorized."}, {status: 401});
    }

    const applications = await listVisaApplicationsForUser(user.id);

    return privateJson({applications});
  } catch (error) {
    reportServerError("visa.applications.list_failed", error);

    return privateJson(
      {
        message:
          error instanceof Error ? error.message : "Unable to load visa applications."
      },
      {status: 500}
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateJson({message: "Unauthorized."}, {status: 401});
    }

    const input = createVisaApplicationBodySchema.parse(await request.json());
    const visaCountry = findVisaCountryOptionByQuery(input.visaCountryCode);

    if (!visaCountry) {
      return privateJson({message: "The selected visa service is unavailable."}, {status: 400});
    }

    const applicationId = await createVisaApplicationDraft({
      nationalityCountryCode: normalizeCountryCode(input.nationalityCountryCode),
      travelDate: input.travelDate || undefined,
      userId: user.id,
      visaCountryCode: visaCountry.code,
      visaType: input.visaType
    });
    const application = await getVisaApplicationForUser(applicationId, user.id);

    if (!application) {
      throw new Error("Unable to create the visa application draft.");
    }

    return privateJson(
      {
        application: {
          ...application,
          uploadCount: 0,
          uploads: []
        }
      },
      {status: 201}
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return privateJson(
        {
          message: error.issues[0]?.message ?? "Invalid visa application request."
        },
        {status: 400}
      );
    }

    reportServerError("visa.applications.create_failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to create the visa application.";
    const status = message === "Unauthorized." ? 401 : 400;

    return privateJson({message}, {status});
  }
}
