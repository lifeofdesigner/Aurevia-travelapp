function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function ensureUrl(value: string, key: string) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid public environment configuration: ${key} must be a valid URL.`);
  }
}

export type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

export type SupabasePublicConfig = {
  key: string;
  url: string;
};

export function getPublicEnv(): PublicEnv {
  const appUrl = normalizeOptionalString(process.env.NEXT_PUBLIC_APP_URL) ?? "http://localhost:3000";
  const paystackPublicKey = normalizeOptionalString(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
  const supabaseUrl = normalizeOptionalString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalizeOptionalString(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anonKey = normalizeOptionalString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return {
    NEXT_PUBLIC_APP_URL: ensureUrl(appUrl, "NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: paystackPublicKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl
      ? ensureUrl(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL")
      : undefined
  };
}

export function getSupabasePublicConfig(
  env: PublicEnv = getPublicEnv()
): SupabasePublicConfig {
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error(
      "Supabase public environment values are required before creating a Supabase client. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or use NEXT_PUBLIC_SUPABASE_ANON_KEY as a legacy fallback."
    );
  }

  return {
    key,
    url: env.NEXT_PUBLIC_SUPABASE_URL
  };
}
