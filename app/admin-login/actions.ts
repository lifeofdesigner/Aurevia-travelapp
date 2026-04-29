"use server";

import {redirect} from "next/navigation";

import {signInAdmin} from "@/lib/auth/admin-auth";
import {defaultLocale} from "@/lib/i18n/routing";

export type AdminLoginActionState = {
  error: string | null;
};

export async function authenticateAdmin(
  _previousState: AdminLoginActionState,
  formData: FormData
): Promise<AdminLoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required."
    };
  }

  const result = await signInAdmin(email, password);

  if (!result.success) {
    return {
      error: result.error
    };
  }

  redirect(`/${defaultLocale}/admin`);
}
