import {type NextRequest, NextResponse} from "next/server";

import {listSetupUsers, requireSetupAccess, SetupRequestError} from "@/server/setup/service";

export async function GET(request: NextRequest) {
  try {
    requireSetupAccess(request);

    const response = await listSetupUsers();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load users.";
    const status = error instanceof SetupRequestError ? error.status : 500;

    return NextResponse.json({message}, {status});
  }
}
