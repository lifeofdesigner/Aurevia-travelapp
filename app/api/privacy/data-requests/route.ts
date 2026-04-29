import {NextResponse} from "next/server";

import {parsePrivacyDataRequestInput} from "@/features/account/lib/privacy-schemas";
import {createDataRequestForUser} from "@/server/privacy/data-request-service";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user) {
      return NextResponse.json({message: "Unauthorized."}, {status: 401});
    }

    const input = parsePrivacyDataRequestInput(await request.json());
    await createDataRequestForUser({
      details: {details: input.details},
      requestedEmail: user.email ?? "unknown@aurevia.local",
      requestType: input.requestType,
      userId: user.id
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create the data request."
      },
      {status: 400}
    );
  }
}
