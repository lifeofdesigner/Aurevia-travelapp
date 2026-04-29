import {type NextRequest, NextResponse} from "next/server";

import {
  requireSetupAccess,
  type SetupUserRole,
  SetupRequestError,
  updateSetupUser
} from "@/server/setup/service";

export async function POST(request: NextRequest) {
  try {
    requireSetupAccess(request);

    const payload = (await request.json()) as {
      isActive?: boolean;
      role?: string;
      userId?: string;
    };

    await updateSetupUser({
      isActive: payload.isActive,
      role: payload.role as SetupUserRole | undefined,
      userId: payload.userId ?? ""
    });

    return NextResponse.json({
      message: "User updated successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the user.";
    const status = error instanceof SetupRequestError ? error.status : 500;

    return NextResponse.json({message}, {status});
  }
}
