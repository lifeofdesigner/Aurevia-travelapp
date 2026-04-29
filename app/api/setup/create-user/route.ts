import {type NextRequest, NextResponse} from "next/server";

import {type AdminRole} from "@/lib/auth/admin-auth-config";
import {createSetupUser, requireSetupAccess, SetupRequestError} from "@/server/setup/service";

export async function POST(request: NextRequest) {
  try {
    requireSetupAccess(request);

    const payload = (await request.json()) as {
      email?: string;
      fullName?: string;
      kind?: "admin" | "customer";
      password?: string;
      phone?: string | null;
      role?: string;
    };

    if (payload.kind !== "admin" && payload.kind !== "customer") {
      throw new SetupRequestError("User kind must be either admin or customer.", 400);
    }

    await createSetupUser({
      email: payload.email ?? "",
      fullName: payload.fullName ?? "",
      kind: payload.kind,
      password: payload.password ?? "",
      phone: payload.phone ?? null,
      role: payload.role as AdminRole | undefined
    });

    return NextResponse.json({
      message:
        payload.kind === "admin"
          ? "Admin user created. They can now log in at /admin-login"
          : "Customer user created successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the user.";
    const status = error instanceof SetupRequestError ? error.status : 500;

    return NextResponse.json({message}, {status});
  }
}
