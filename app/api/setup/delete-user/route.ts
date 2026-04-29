import {type NextRequest, NextResponse} from "next/server";

import {deleteSetupUser, requireSetupAccess, SetupRequestError} from "@/server/setup/service";

export async function POST(request: NextRequest) {
  try {
    requireSetupAccess(request);

    const payload = (await request.json()) as {
      userId?: string;
    };

    await deleteSetupUser(payload.userId ?? "");

    return NextResponse.json({
      message: "User deleted successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete the user.";
    const status = error instanceof SetupRequestError ? error.status : 500;

    return NextResponse.json({message}, {status});
  }
}
