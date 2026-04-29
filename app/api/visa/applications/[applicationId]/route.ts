import {NextResponse} from "next/server";
import {ZodError} from "zod";

import {
  parseVisaApplicationFormValues,
  parseVisaApplicationMutationPayload,
  parseVisaDraftValues
} from "@/features/visa/lib/schemas";
import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {
  saveVisaApplicationDraft,
  submitVisaApplication
} from "@/server/visa/application-service";
import {getVisaApplicationForUser, getVisaUploadsForUser} from "@/server/visa/query-service";

type VisaApplicationRouteContext = {
  params: {
    applicationId: string;
  };
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  applyPrivateRouteHeaders(response.headers);
  return response;
}

async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();

  return userResult.data.user;
}

export async function GET(_: Request, {params}: VisaApplicationRouteContext) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateJson({message: "Unauthorized."}, {status: 401});
    }

    const application = await getVisaApplicationForUser(params.applicationId, user.id);

    if (!application) {
      return privateJson({message: "The visa application could not be found."}, {status: 404});
    }

    const uploads = await getVisaUploadsForUser(application.id, user.id);

    return privateJson({
      application: {
        ...application,
        uploadCount: uploads.length,
        uploads
      }
    });
  } catch (error) {
    reportServerError("visa.applications.detail_failed", error, {
      applicationId: params.applicationId
    });

    return privateJson(
      {
        message:
          error instanceof Error ? error.message : "Unable to load the visa application."
      },
      {status: 500}
    );
  }
}

export async function PATCH(request: Request, {params}: VisaApplicationRouteContext) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateJson({message: "Unauthorized."}, {status: 401});
    }

    const input = parseVisaApplicationMutationPayload(await request.json());

    if (input.action === "save_draft") {
      const result = await saveVisaApplicationDraft({
        applicationId: params.applicationId,
        formData: parseVisaDraftValues(input.formData),
        userId: user.id
      });

      return privateJson(result);
    }

    const result = await submitVisaApplication({
      applicationId: params.applicationId,
      formData: parseVisaApplicationFormValues(input.formData),
      userId: user.id
    });

    return privateJson(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return privateJson(
        {
          message: error.issues[0]?.message ?? "Invalid visa application update."
        },
        {status: 400}
      );
    }

    reportServerError("visa.applications.update_failed", error, {
      applicationId: params.applicationId
    });
    const message =
      error instanceof Error ? error.message : "Unable to update the visa application.";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "The visa application could not be found."
          ? 404
          : 400;

    return privateJson({message}, {status});
  }
}
