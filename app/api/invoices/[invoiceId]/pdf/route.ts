import {type NextRequest, NextResponse} from "next/server";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {reportServerError} from "@/server/observability/logger";
import {createInvoicePdfAccessUrl} from "@/server/payments/invoice-storage";

type InvoicePdfAccessRouteProps = {
  params: {
    invoiceId: string;
  };
};

export async function GET(
  _request: NextRequest,
  {params}: InvoicePdfAccessRouteProps
) {
  const supabase = createSupabaseServerClient();
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    const response = NextResponse.json(
      {
        message: "Sign in is required before accessing invoice documents."
      },
      {status: 401}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }

  try {
    const accessUrl = await createInvoicePdfAccessUrl({
      invoiceId: params.invoiceId,
      userId: user.id
    });

    const response = NextResponse.redirect(accessUrl);
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    reportServerError("payments.invoice.access_failed", error, {
      invoiceId: params.invoiceId,
      userId: user.id
    });
    const response = NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to prepare invoice access."
      },
      {status: 404}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
