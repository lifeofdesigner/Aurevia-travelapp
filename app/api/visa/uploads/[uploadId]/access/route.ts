import {NextResponse} from "next/server";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {createVisaUploadAccessUrl} from "@/server/visa/upload-service";

type VisaUploadAccessRouteContext = {
  params: {
    uploadId: string;
  };
};

export async function GET(_: Request, {params}: VisaUploadAccessRouteContext) {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user) {
      const response = NextResponse.json(
        {
          message: "Unauthorized."
        },
        {status: 401}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const accessUrl = await createVisaUploadAccessUrl({
      uploadId: params.uploadId,
      userId: user.id
    });

    const response = NextResponse.redirect(accessUrl);
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    reportServerError("visa.upload.access_failed", error, {
      uploadId: params.uploadId
    });
    const response = NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to prepare secure document access."
      },
      {status: 400}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
