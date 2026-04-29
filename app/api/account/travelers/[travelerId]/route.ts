import {NextResponse} from "next/server";

import {parseTravelerProfileInput} from "@/features/account/lib/schemas";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {
  deleteTravelerProfileForUser,
  updateTravelerProfileForUser
} from "@/server/account/dashboard-service";

type TravelerRouteContext = {
  params: {
    travelerId: string;
  };
};

export async function PATCH(request: Request, {params}: TravelerRouteContext) {
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
    const travelers = await updateTravelerProfileForUser(user.id, params.travelerId, input);

    return NextResponse.json({
      travelers
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update the traveler profile."
      },
      {status: 400}
    );
  }
}

export async function DELETE(_: Request, {params}: TravelerRouteContext) {
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

    const travelers = await deleteTravelerProfileForUser(user.id, params.travelerId);

    return NextResponse.json({
      travelers
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the traveler profile."
      },
      {status: 400}
    );
  }
}
