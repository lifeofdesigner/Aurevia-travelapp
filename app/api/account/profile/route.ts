import {NextResponse} from "next/server";

import {parseProfileSettingsInput} from "@/features/account/lib/schemas";
import {updateProfileSettingsForUser} from "@/server/account/dashboard-service";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function PATCH(request: Request) {
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

    const input = parseProfileSettingsInput(await request.json());
    const profile = await updateProfileSettingsForUser(user.id, input);

    return NextResponse.json({
      profile
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update the profile settings."
      },
      {status: 400}
    );
  }
}
