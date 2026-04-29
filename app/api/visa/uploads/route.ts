import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {VISA_DOCUMENT_TYPES} from "@/features/visa/types";
import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {uploadVisaDocument} from "@/server/visa/upload-service";

const visaUploadFormSchema = z.object({
  applicationId: z.string().uuid("A valid visa application id is required."),
  documentType: z.enum(VISA_DOCUMENT_TYPES)
});

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

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateJson({message: "Unauthorized."}, {status: 401});
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return privateJson({message: "A visa document file is required."}, {status: 400});
    }

    const input = visaUploadFormSchema.parse({
      applicationId: formData.get("applicationId"),
      documentType: formData.get("documentType")
    });
    const upload = await uploadVisaDocument({
      applicationId: input.applicationId,
      documentType: input.documentType,
      file,
      userId: user.id
    });

    return privateJson(
      {
        ...upload,
        fileUrl: upload.accessPath
      },
      {status: 201}
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return privateJson(
        {
          message: error.issues[0]?.message ?? "Invalid visa upload request."
        },
        {status: 400}
      );
    }

    reportServerError("visa.upload.create_failed", error);
    const message = error instanceof Error ? error.message : "Unable to upload visa document.";
    const status = message === "Unauthorized." ? 401 : 400;

    return privateJson({message}, {status});
  }
}
