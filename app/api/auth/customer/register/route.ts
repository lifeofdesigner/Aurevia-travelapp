import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {createSupabaseServerClient} from "@/lib/supabase/server";
import {
  getCustomerAccessSettings,
  syncCustomerAuthConfirmationForSettings
} from "@/server/customer-access/settings";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

const registerSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2),
  nextPath: z.string().optional(),
  password: z.string().min(8),
  phone: z.string().trim().optional().nullable()
});

function splitFullName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);

  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

function buildRedirectUrl(request: Request, nextPath: string | undefined) {
  const url = new URL("/auth/callback", request.url);
  url.searchParams.set("next", nextPath?.startsWith("/") ? nextPath : "/en/dashboard");
  return url.toString();
}

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const settings = await getCustomerAccessSettings();
    const supabase = createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const email = input.email.toLowerCase();
    const phone = input.phone?.trim() || null;

    if (settings.customerLoginRequiresSmsConfirmation && !phone) {
      return NextResponse.json(
        {message: "Phone number is required when SMS confirmation is enabled."},
        {status: 400}
      );
    }

    const {firstName, lastName} = splitFullName(input.fullName);
    const signUpResult = await supabase.auth.signUp({
      email,
      options: {
        data: {
          first_name: firstName,
          full_name: input.fullName,
          last_name: lastName
        },
        emailRedirectTo: buildRedirectUrl(request, input.nextPath)
      },
      password: input.password
    });

    if (signUpResult.error || !signUpResult.data.user) {
      const message = signUpResult.error?.message ?? "Unable to create the account.";
      return NextResponse.json(
        {
          message:
            message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")
              ? "A user with that email already exists."
              : message
        },
        {status: 400}
      );
    }

    const user = signUpResult.data.user;
    const profileResult = await admin.from("profiles").upsert(
      {
        email,
        first_name: firstName,
        is_suspended: false,
        last_name: lastName,
        phone,
        role: "customer",
        suspended_at: null,
        user_id: user.id
      },
      {onConflict: "user_id"}
    );

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }

    if (phone) {
      const phoneUpdate = await admin.auth.admin.updateUserById(user.id, {
        phone,
        phone_confirm: !settings.customerLoginRequiresSmsConfirmation
      });

      if (phoneUpdate.error) {
        throw new Error(phoneUpdate.error.message);
      }
    }

    if (settings.customerLoginRequiresEmailConfirmation) {
      return NextResponse.json({
        needsEmailConfirmation: true,
        ok: true,
        signedIn: false
      });
    }

    if (settings.customerLoginRequiresSmsConfirmation) {
      return NextResponse.json({
        message: "Account created. Confirm the phone number by SMS before signing in.",
        needsSmsConfirmation: true,
        ok: true,
        signedIn: false
      });
    }

    await syncCustomerAuthConfirmationForSettings({
      settings,
      userId: user.id
    });

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (signInResult.error) {
      throw new Error(signInResult.error.message);
    }

    return NextResponse.json({
      ok: true,
      signedIn: true
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid registration request."},
        {status: 400}
      );
    }

    return NextResponse.json(
      {message: error instanceof Error ? error.message : "Unable to register."},
      {status: 500}
    );
  }
}
