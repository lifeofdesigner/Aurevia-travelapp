import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {createSupabaseServerClient} from "@/lib/supabase/server";
import {getCustomerAccessSettings, syncCustomerAuthConfirmationForSettings} from "@/server/customer-access/settings";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

type CustomerProfile = {
  is_suspended: boolean | null;
  role: string | null;
  user_id: string;
};

function isEmailNotConfirmed(message: string | undefined) {
  return Boolean(message?.toLowerCase().includes("email not confirmed"));
}

function getPhoneConfirmedAt(user: {phone_confirmed_at?: string | null}) {
  return typeof user.phone_confirmed_at === "string" ? user.phone_confirmed_at : null;
}

async function getCustomerProfileByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("profiles")
    .select("user_id, role, is_suspended")
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data as CustomerProfile | null) ?? null;
}

async function getCustomerProfileById(userId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("profiles")
    .select("user_id, role, is_suspended")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data as CustomerProfile | null) ?? null;
}

export async function POST(request: Request) {
  try {
    const input = signInSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const settings = await getCustomerAccessSettings();
    const supabase = createSupabaseServerClient();
    let signInResult = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (
      signInResult.error &&
      isEmailNotConfirmed(signInResult.error.message) &&
      !settings.customerLoginRequiresEmailConfirmation
    ) {
      const profile = await getCustomerProfileByEmail(email);

      if (!profile || profile.role !== "customer" || profile.is_suspended) {
        return NextResponse.json(
          {message: "This customer account is not approved for login."},
          {status: 403}
        );
      }

      await syncCustomerAuthConfirmationForSettings({
        settings,
        userId: profile.user_id
      });
      signInResult = await supabase.auth.signInWithPassword({
        email,
        password: input.password
      });
    }

    if (signInResult.error || !signInResult.data.user) {
      return NextResponse.json(
        {
          message: signInResult.error?.message ?? "Unable to sign in."
        },
        {status: 401}
      );
    }

    const user = signInResult.data.user;
    const profile = await getCustomerProfileById(user.id);

    if (!profile || profile.role !== "customer" || profile.is_suspended) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {message: "This customer account is not approved for login."},
        {status: 403}
      );
    }

    if (settings.customerLoginRequiresEmailConfirmation && !user.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json({message: "Email not confirmed."}, {status: 403});
    }

    if (
      settings.customerLoginRequiresSmsConfirmation &&
      (!user.phone || !getPhoneConfirmedAt(user))
    ) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {message: "SMS confirmation is required before this customer can log in."},
        {status: 403}
      );
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid sign-in request."},
        {status: 400}
      );
    }

    return NextResponse.json(
      {message: error instanceof Error ? error.message : "Unable to sign in."},
      {status: 500}
    );
  }
}
