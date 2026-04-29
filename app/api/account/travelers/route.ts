import {NextResponse} from "next/server";

import {parseTravelerProfileInput} from "@/features/account/lib/schemas";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {createTravelerProfileForUser} from "@/server/account/dashboard-service";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user) {
      return NextResponse.json(
        {
          message: "Unauthorized."
        },
        {status: 401}
      );
    }

    const input = parseTravelerProfileInput(await request.json());
    const travelers = await createTravelerProfileForUser(user.id, input);

    return NextResponse.json({
      travelers
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the traveler profile."
      },
      {status: 400}
    );
  }
}
