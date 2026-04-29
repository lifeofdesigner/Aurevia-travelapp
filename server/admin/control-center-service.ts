import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";
import {type User} from "@supabase/supabase-js";

import {createAdminAuditLog} from "@/server/admin/audit";
import {saveGlobalSiteSetting} from "@/server/admin/site-settings-service";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {getDefaultSiteBranding, normalizeSiteBranding} from "@/server/brand/site-branding";
import {
  CUSTOMER_ACCESS_SETTINGS_KEY,
  getCustomerAccessSettings,
  normalizeCustomerAccessSettings,
  syncCustomerAuthConfirmationForSettings
} from "@/server/customer-access/settings";
import {getServerEnv, requireServerEnv} from "@/lib/env/server";
import {
  isAdminRole,
  mapAdminRoleToLegacyRole
} from "@/lib/auth/admin-auth-config";
import {
  ADMIN_INTEGRATION_KEYS,
  ADMIN_PAYMENT_METHOD_KEYS,
  type AdminAccessSettings,
  type AdminBookingSettings,
  type AdminEmailProvider,
  type AdminEmailSettings,
  type AdminGeneralSettings,
  type AdminIntegrationEnvironment,
  type AdminIntegrationKey,
  type AdminIntegrationStatus,
  type AdminIntegrationsManagerData,
  type AdminMaintenanceSettings,
  type AdminManagedUserRole,
  type AdminPaymentMethodKey,
  type AdminPaymentProviderCredentialView,
  type AdminPaymentSettings,
  type AdminSiteSettingsData,
  type AdminSiteSettingsSection,
  type AdminStaffUserRecord,
  type AdminUsersManagerData
} from "@/features/admin/lib/control-center-types";
import {type AdminStaffIdentity} from "@/features/admin/types";
import {CURRENCY_CODES, type UserRole} from "@/types/database-enums";
import {type Json} from "@/types/supabase";

type StoredEncryptedSecret = {
  algorithm: "aes-256-gcm";
  authTag: string;
  ciphertext: string;
  iv: string;
  last4: string;
};

type StoredIntegrationSetting = {
  environment: AdminIntegrationEnvironment;
  lastTestMessage: string | null;
  lastTestStatus: AdminIntegrationStatus;
  lastTestedAt: string | null;
  provider: AdminEmailProvider | null;
  secrets: Record<string, StoredEncryptedSecret>;
};

type AdminDirectoryProfileRow = {
  created_at: string | null;
  email: string | null;
  first_name: string | null;
  is_suspended: boolean | null;
  last_name: string | null;
  last_signed_in_at: string | null;
  phone: string | null;
  role: UserRole | null;
  user_id: string;
};

type AdminDirectoryAdminUserRow = {
  created_at: string | null;
  created_by: string | null;
  email: string;
  full_name: string | null;
  id: string;
  is_active: boolean | null;
  last_login: string | null;
  role: string | null;
};

const INTEGRATION_SETTING_KEYS: Record<AdminIntegrationKey, string> = {
  duffel: "admin_integration_duffel",
  email_delivery: "admin_integration_email_delivery",
  exchange_rates: "admin_integration_exchange_rates",
  flutterwave: "admin_integration_flutterwave",
  google_maps: "admin_integration_google_maps",
  korapay: "admin_integration_korapay",
  paystack: "admin_integration_paystack",
  stripe: "admin_integration_stripe"
};

const SITE_SETTINGS_KEYS: Record<AdminSiteSettingsSection, string> = {
  access: CUSTOMER_ACCESS_SETTINGS_KEY,
  booking: "admin_site_settings_booking",
  email: "admin_site_settings_email",
  general: "admin_site_settings_general",
  maintenance: "admin_site_settings_maintenance",
  payment: "admin_site_settings_payment"
};

const INTEGRATION_METADATA: Record<
  AdminIntegrationKey,
  {
    description: string;
    fields: Array<{label: string; name: string; placeholder: string}>;
    title: string;
  }
> = {
  duffel: {
    description: "Live flight search and airport autocomplete for Duffel-powered shopping.",
    fields: [
      {
        label: "Access token",
        name: "accessToken",
        placeholder: "duffel_test_..."
      }
    ],
    title: "Duffel"
  },
  email_delivery: {
    description: "Transactional email delivery for booking, payment, and customer messaging flows.",
    fields: [
      {
        label: "API key",
        name: "apiKey",
        placeholder: "re_... or SG...."
      }
    ],
    title: "Resend / SendGrid"
  },
  exchange_rates: {
    description: "Foreign exchange rate provider used for live multi-currency pricing.",
    fields: [
      {
        label: "API key",
        name: "apiKey",
        placeholder: "ExchangeRate-API key"
      }
    ],
    title: "Exchange Rate API"
  },
  flutterwave: {
    description: "Hosted card, bank, mobile money, and regional checkout for African and global payments.",
    fields: [
      {
        label: "Secret key",
        name: "secretKey",
        placeholder: "FLWSECK_TEST-..."
      },
      {
        label: "Public key",
        name: "publicKey",
        placeholder: "FLWPUBK_TEST-..."
      },
      {
        label: "Webhook secret hash",
        name: "webhookSecret",
        placeholder: "Random secret hash from Flutterwave"
      }
    ],
    title: "Flutterwave"
  },
  google_maps: {
    description: "Map rendering and geocoding support for hotel and destination experiences.",
    fields: [
      {
        label: "API key",
        name: "apiKey",
        placeholder: "Google Maps API key"
      }
    ],
    title: "Google Maps"
  },
  korapay: {
    description: "Kora checkout for card, bank transfer, Pay with Bank, and mobile money payments.",
    fields: [
      {
        label: "Secret key",
        name: "secretKey",
        placeholder: "sk_test_..."
      },
      {
        label: "Public key",
        name: "publicKey",
        placeholder: "pk_test_..."
      }
    ],
    title: "Korapay"
  },
  paystack: {
    description: "Nigerian card and bank payment processing for local checkout flows.",
    fields: [
      {
        label: "Secret key",
        name: "secretKey",
        placeholder: "sk_test_..."
      },
      {
        label: "Public key",
        name: "publicKey",
        placeholder: "pk_test_..."
      }
    ],
    title: "Paystack"
  },
  stripe: {
    description: "International payments, checkout, and refunds for global customers.",
    fields: [
      {
        label: "Secret key",
        name: "secretKey",
        placeholder: "sk_test_..."
      },
      {
        label: "Publishable key",
        name: "publishableKey",
        placeholder: "pk_test_..."
      },
      {
        label: "Webhook secret",
        name: "webhookSecret",
        placeholder: "whsec_..."
      }
    ],
    title: "Stripe"
  }
};

function assertOwner(actor: AdminStaffIdentity) {
  if (actor.role !== "owner") {
    throw new Error("Forbidden.");
  }
}

function assertSettingsManager(actor: AdminStaffIdentity) {
  if (!["admin", "owner"].includes(actor.role)) {
    throw new Error("Forbidden.");
  }
}

function asRecord(value: Json | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim();
  const [firstName, ...rest] = normalized.split(/\s+/);

  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

function joinFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || null;
}

function getAuthUserMetadataString(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? normalizeOptionalString(value) ?? null : null;
}

function getAuthUserFullName(user: User) {
  return (
    getAuthUserMetadataString(user, "full_name") ??
    joinFullName(
      getAuthUserMetadataString(user, "first_name"),
      getAuthUserMetadataString(user, "last_name")
    )
  );
}

function mapProfileRoleToManagedRole(role: UserRole | null | undefined): AdminManagedUserRole {
  switch (role) {
    case "owner":
      return "super_admin";
    case "admin":
      return "admin";
    case "support":
      return "support";
    default:
      return "customer";
  }
}

function mapManagedRoleToProfileRole(role: AdminManagedUserRole): UserRole {
  if (role === "customer") {
    return "customer";
  }

  return mapAdminRoleToLegacyRole(role);
}

function resolveManagedRole(
  profile: AdminDirectoryProfileRow | null,
  adminUser: AdminDirectoryAdminUserRow | null
): AdminManagedUserRole {
  if (adminUser && isAdminRole(adminUser.role)) {
    return adminUser.role;
  }

  return mapProfileRoleToManagedRole(profile?.role);
}

function buildManagedUserRecord(
  authUser: User,
  profile: AdminDirectoryProfileRow | null,
  adminUser: AdminDirectoryAdminUserRow | null
): AdminStaffUserRecord {
  const role = resolveManagedRole(profile, adminUser);
  const email = authUser.email ?? profile?.email ?? adminUser?.email ?? "";
  const name =
    adminUser?.full_name ??
    joinFullName(profile?.first_name, profile?.last_name) ??
    getAuthUserFullName(authUser) ??
    email;
  const isActive = adminUser
    ? adminUser.is_active !== false && profile?.is_suspended !== true
    : profile?.is_suspended !== true;
  const createdAt =
    normalizeOptionalString(authUser.created_at) ??
    normalizeOptionalString(profile?.created_at) ??
    normalizeOptionalString(adminUser?.created_at) ??
    new Date(0).toISOString();
  const lastLoginAt =
    normalizeOptionalString(adminUser?.last_login) ??
    normalizeOptionalString(profile?.last_signed_in_at) ??
    normalizeOptionalString(authUser.last_sign_in_at);

  return {
    accountType: role === "customer" ? "customer" : "admin",
    createdAt,
    email,
    isActive,
    lastLoginAt: lastLoginAt ?? null,
    name,
    phone: profile?.phone ?? null,
    role,
    userId: authUser.id
  };
}

function chunkArray<TValue>(values: TValue[], size: number) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function listAllAuthUsers() {
  const admin = createSupabaseAdminClient();
  const users: User[] = [];
  let nextPage: number | null = 1;
  let total = 0;

  while (nextPage) {
    const result = await admin.auth.admin.listUsers({
      page: nextPage,
      perPage: 200
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    users.push(...result.data.users);
    total = typeof result.data.total === "number" && result.data.total > 0
      ? result.data.total
      : Math.max(total, users.length);
    nextPage = result.data.nextPage;

    if (result.data.users.length === 0) {
      break;
    }
  }

  return {
    total: total || users.length,
    users
  };
}

async function fetchDirectoryRows(userIds: string[]) {
  const admin = createSupabaseAdminClient();
  const profiles: AdminDirectoryProfileRow[] = [];
  const adminUsers: AdminDirectoryAdminUserRow[] = [];

  for (const userIdChunk of chunkArray(userIds, 100)) {
    const [profilesResult, adminUsersResult] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "user_id, email, first_name, last_name, phone, role, created_at, last_signed_in_at, is_suspended"
        )
        .in("user_id", userIdChunk)
        .is("deleted_at", null),
      admin
        .from("admin_users")
        .select("id, email, full_name, role, is_active, last_login, created_at, created_by")
        .in("id", userIdChunk)
    ]);

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (adminUsersResult.error) {
      throw new Error(adminUsersResult.error.message);
    }

    profiles.push(...(((profilesResult.data as AdminDirectoryProfileRow[] | null) ?? [])));
    adminUsers.push(...(((adminUsersResult.data as AdminDirectoryAdminUserRow[] | null) ?? [])));
  }

  return {
    adminUsers,
    profiles
  };
}

function getSecretEncryptionKey() {
  const configuredKey = process.env.ADMIN_SECRET_ENCRYPTION_KEY?.trim();
  const source = configuredKey && configuredKey.length > 0
    ? configuredKey
    : requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createHash("sha256").update(source).digest();
}

function encryptSecret(value: string): StoredEncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return {
    algorithm: "aes-256-gcm",
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    last4: value.slice(-4)
  };
}

function decryptSecret(value: StoredEncryptedSecret) {
  const decipher = createDecipheriv(
    value.algorithm,
    getSecretEncryptionKey(),
    Buffer.from(value.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

function parseStoredIntegrationSetting(value: Json | null | undefined): StoredIntegrationSetting {
  const record = asRecord(value);
  const secretsRecord = asRecord((record.secrets as Json | undefined) ?? {});
  const secrets: Record<string, StoredEncryptedSecret> = {};

  for (const [key, entry] of Object.entries(secretsRecord)) {
    const secretEntry = asRecord(entry as Json);
    const algorithm = secretEntry.algorithm;
    const authTag = secretEntry.authTag;
    const ciphertext = secretEntry.ciphertext;
    const iv = secretEntry.iv;
    const last4 = secretEntry.last4;

    if (
      algorithm === "aes-256-gcm" &&
      typeof authTag === "string" &&
      typeof ciphertext === "string" &&
      typeof iv === "string" &&
      typeof last4 === "string"
    ) {
      secrets[key] = {
        algorithm,
        authTag,
        ciphertext,
        iv,
        last4
      };
    }
  }

  const environment = record.environment === "live" ? "live" : "test";
  const provider =
    record.provider === "sendgrid" || record.provider === "resend"
      ? record.provider
      : null;
  const lastTestStatus =
    record.lastTestStatus === "connected" || record.lastTestStatus === "failed"
      ? record.lastTestStatus
      : "not_tested";

  return {
    environment,
    lastTestMessage:
      typeof record.lastTestMessage === "string" ? record.lastTestMessage : null,
    lastTestStatus,
    lastTestedAt: typeof record.lastTestedAt === "string" ? record.lastTestedAt : null,
    provider,
    secrets
  };
}

function toJson(value: unknown) {
  return value as Json;
}

async function readSettingMap(keys: string[]) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("site_settings")
    .select("setting_key, setting_value")
    .in("setting_key", keys)
    .is("locale", null);

  return new Map(
    (((result.data as Array<{setting_key: string; setting_value: Json}> | null) ?? []).map(
      (row) => [row.setting_key, row.setting_value] as const
    ))
  );
}

async function upsertGlobalSetting({
  description,
  key,
  value
}: {
  description: string;
  key: string;
  value: unknown;
}) {
  return saveGlobalSiteSetting({
    description,
    key,
    value: toJson(value)
  });
}

function getDefaultGeneralSettings(): AdminGeneralSettings {
  return getDefaultSiteBranding();
}

function getDefaultBookingSettings(): AdminBookingSettings {
  return {
    cancellationPolicyText:
      "Flexible cancellation windows vary by supplier and fare family. Final eligibility is shown at checkout.",
    defaultCurrency: "EUR",
    serviceFeePercentage: 3,
    supportedCurrencies: [...CURRENCY_CODES],
    termsAndConditionsUrl: "/terms"
  };
}

function getDefaultEmailSettings(branding = getDefaultSiteBranding()): AdminEmailSettings {
  return {
    automations: {
      bookingCancellation: true,
      bookingConfirmation: true,
      bookingReminder: true,
      paymentReceipt: true,
      visaStatusUpdate: true,
      welcome: true
    },
    footerText: `${branding.siteName} | ${branding.businessLocation} | ${branding.contactEmail}`,
    fromEmail: "bookings@aurevia.travel",
    fromName: branding.siteName,
    replyToEmail: branding.contactEmail
  };
}

function rewriteDefaultBrandText(value: string, branding = getDefaultSiteBranding()) {
  const firstBrandWord = branding.siteName.trim().split(/\s+/)[0] || branding.siteName;

  return value
    .replaceAll("Aurevia Travel", branding.siteName)
    .replace(/\bAurevia\b/g, firstBrandWord)
    .replaceAll("Vienna, Austria", branding.businessLocation)
    .replaceAll("Vienna-based", `${branding.businessCity}-based`)
    .replaceAll("from Vienna", `from ${branding.businessCity}`);
}

function getDefaultPaymentSettings(branding = getDefaultSiteBranding()): AdminPaymentSettings {
  return {
    bankTransferDetails:
      `Bank: ${branding.siteName} Holding\nIBAN: AT00 0000 0000 0000 0000\nBIC: AUREATWW`,
    paymentMethods: ["stripe", "paystack", "bank_transfer"],
    providerCredentials: [],
    refundProcessingDays: 7
  };
}

function getDefaultMaintenanceSettings(): AdminMaintenanceSettings {
  return {
    allowedIps: [],
    enabled: false,
    message: "The site is undergoing scheduled maintenance. Please check back shortly."
  };
}

export async function getAdminIntegrationsManagerData(): Promise<AdminIntegrationsManagerData> {
  const settingMap = await readSettingMap(
    ADMIN_INTEGRATION_KEYS.map((key) => INTEGRATION_SETTING_KEYS[key])
  );

  return {
    items: ADMIN_INTEGRATION_KEYS.map((key) => {
      const stored = parseStoredIntegrationSetting(
        settingMap.get(INTEGRATION_SETTING_KEYS[key])
      );
      return buildIntegrationView(key, stored);
    })
  };
}

function buildIntegrationView(
  key: AdminIntegrationKey,
  stored: StoredIntegrationSetting
) {
  const metadata = INTEGRATION_METADATA[key];

  return {
    description: metadata.description,
    environment: stored.environment,
    fields: metadata.fields.map((field) => ({
      label: field.label,
      maskedValue: stored.secrets[field.name]?.last4 ?? null,
      name: field.name,
      placeholder: field.placeholder
    })),
    key,
    lastTestMessage: stored.lastTestMessage,
    lastTestedAt: stored.lastTestedAt,
    provider: stored.provider,
    status: stored.lastTestStatus,
    title: metadata.title
  };
}

function normalizePaymentMethods(
  value: unknown,
  branding = getDefaultSiteBranding()
): AdminPaymentMethodKey[] {
  if (!Array.isArray(value)) {
    return getDefaultPaymentSettings(branding).paymentMethods;
  }

  const methods = value.filter(
    (entry): entry is AdminPaymentMethodKey =>
      typeof entry === "string" &&
      ADMIN_PAYMENT_METHOD_KEYS.includes(entry as AdminPaymentMethodKey)
  );

  return methods.length > 0 ? methods : getDefaultPaymentSettings(branding).paymentMethods;
}

function normalizePaymentSettings(
  value: Json | null | undefined,
  providerCredentials: AdminPaymentProviderCredentialView[],
  branding = getDefaultSiteBranding()
): AdminPaymentSettings {
  const defaults = getDefaultPaymentSettings(branding);
  const record = asRecord(value);
  const refundProcessingDays = Number(record.refundProcessingDays ?? defaults.refundProcessingDays);
  const bankTransferDetails =
    typeof record.bankTransferDetails === "string" && record.bankTransferDetails.trim()
      ? rewriteDefaultBrandText(record.bankTransferDetails, branding)
      : defaults.bankTransferDetails;

  return {
    bankTransferDetails,
    paymentMethods: normalizePaymentMethods(record.paymentMethods, branding),
    providerCredentials,
    refundProcessingDays:
      Number.isInteger(refundProcessingDays) && refundProcessingDays >= 0
        ? refundProcessingDays
        : defaults.refundProcessingDays
  };
}

export async function saveAdminIntegrationSetting({
  actor,
  environment,
  key,
  provider,
  secretValues
}: {
  actor: AdminStaffIdentity;
  environment: AdminIntegrationEnvironment;
  key: AdminIntegrationKey;
  provider: AdminEmailProvider | null;
  secretValues: Record<string, string>;
}) {
  assertOwner(actor);

  const settingMap = await readSettingMap([INTEGRATION_SETTING_KEYS[key]]);
  const current = parseStoredIntegrationSetting(settingMap.get(INTEGRATION_SETTING_KEYS[key]));
  const nextSecrets = {...current.secrets};

  for (const [fieldName, secretValue] of Object.entries(secretValues)) {
    const normalizedValue = secretValue.trim();

    if (normalizedValue) {
      nextSecrets[fieldName] = encryptSecret(normalizedValue);
    }
  }

  await upsertGlobalSetting({
    description: `Encrypted configuration for the ${INTEGRATION_METADATA[key].title} integration.`,
    key: INTEGRATION_SETTING_KEYS[key],
    value: {
      environment,
      lastTestMessage: current.lastTestMessage,
      lastTestStatus: current.lastTestStatus,
      lastTestedAt: current.lastTestedAt,
      provider,
      secrets: nextSecrets
    } satisfies StoredIntegrationSetting
  });

  await createAdminAuditLog({
    action: `admin.integration.${key}.saved`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "site_settings",
    metadata: {
      environment,
      key,
      savedFields: Object.keys(secretValues).filter((fieldName) =>
        secretValues[fieldName]?.trim()
      ),
      provider
    }
  });
}

export async function saveAdminPaymentProviderCredentialSetting({
  actor,
  environment,
  key,
  secretValues
}: {
  actor: AdminStaffIdentity;
  environment: AdminIntegrationEnvironment;
  key: Exclude<AdminPaymentMethodKey, "bank_transfer">;
  secretValues: Record<string, string>;
}) {
  assertSettingsManager(actor);

  await saveEncryptedIntegrationSetting({
    actor,
    environment,
    key,
    provider: null,
    secretValues
  });
}

async function saveEncryptedIntegrationSetting({
  actor,
  environment,
  key,
  provider,
  secretValues
}: {
  actor: AdminStaffIdentity;
  environment: AdminIntegrationEnvironment;
  key: AdminIntegrationKey;
  provider: AdminEmailProvider | null;
  secretValues: Record<string, string>;
}) {
  const settingMap = await readSettingMap([INTEGRATION_SETTING_KEYS[key]]);
  const current = parseStoredIntegrationSetting(settingMap.get(INTEGRATION_SETTING_KEYS[key]));
  const nextSecrets = {...current.secrets};

  for (const [fieldName, secretValue] of Object.entries(secretValues)) {
    const normalizedValue = secretValue.trim();

    if (normalizedValue) {
      nextSecrets[fieldName] = encryptSecret(normalizedValue);
    }
  }

  await upsertGlobalSetting({
    description: `Encrypted configuration for the ${INTEGRATION_METADATA[key].title} integration.`,
    key: INTEGRATION_SETTING_KEYS[key],
    value: {
      environment,
      lastTestMessage: current.lastTestMessage,
      lastTestStatus: current.lastTestStatus,
      lastTestedAt: current.lastTestedAt,
      provider,
      secrets: nextSecrets
    } satisfies StoredIntegrationSetting
  });

  await createAdminAuditLog({
    action: `admin.integration.${key}.saved`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "site_settings",
    metadata: {
      environment,
      key,
      savedFields: Object.keys(secretValues).filter((fieldName) =>
        secretValues[fieldName]?.trim()
      ),
      provider
    }
  });
}

export async function getAdminIntegrationRuntimeConfig(key: AdminIntegrationKey) {
  const settingMap = await readSettingMap([INTEGRATION_SETTING_KEYS[key]]);
  const current = parseStoredIntegrationSetting(settingMap.get(INTEGRATION_SETTING_KEYS[key]));
  const secrets = Object.fromEntries(
    Object.entries(current.secrets).map(([fieldName, secret]) => [
      fieldName,
      decryptSecret(secret)
    ])
  );

  return {
    environment: current.environment,
    secrets
  };
}

async function testDuffelConnection(config: StoredIntegrationSetting) {
  const token = config.secrets.accessToken ? decryptSecret(config.secrets.accessToken) : "";

  if (!token) {
    throw new Error("Save a Duffel access token before testing the connection.");
  }

  const response = await fetch("https://api.duffel.com/air/airlines?limit=1", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2"
    }
  });

  if (!response.ok) {
    throw new Error(`Duffel responded with ${response.status}.`);
  }

  return "Duffel connection verified.";
}

async function testPaystackConnection(config: StoredIntegrationSetting) {
  const secretKey = config.secrets.secretKey ? decryptSecret(config.secrets.secretKey) : "";

  if (!secretKey) {
    throw new Error("Save a Paystack secret key before testing the connection.");
  }

  const response = await fetch("https://api.paystack.co/bank?currency=NGN", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Paystack responded with ${response.status}.`);
  }

  return "Paystack connection verified.";
}

async function testStripeConnection(config: StoredIntegrationSetting) {
  const secretKey = config.secrets.secretKey ? decryptSecret(config.secrets.secretKey) : "";

  if (!secretKey) {
    throw new Error("Save a Stripe secret key before testing the connection.");
  }

  const response = await fetch("https://api.stripe.com/v1/balance", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Stripe responded with ${response.status}.`);
  }

  return "Stripe connection verified.";
}

async function testFlutterwaveConnection(config: StoredIntegrationSetting) {
  const secretKey = config.secrets.secretKey ? decryptSecret(config.secrets.secretKey) : "";

  if (!secretKey) {
    throw new Error("Save a Flutterwave secret key before testing the connection.");
  }

  const response = await fetch("https://api.flutterwave.com/v3/transactions?per_page=1", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Flutterwave responded with ${response.status}.`);
  }

  return "Flutterwave connection verified.";
}

async function testKorapayConnection(config: StoredIntegrationSetting) {
  const secretKey = config.secrets.secretKey ? decryptSecret(config.secrets.secretKey) : "";

  if (!secretKey) {
    throw new Error("Save a Korapay secret key before testing the connection.");
  }

  const response = await fetch("https://api.korapay.com/merchant/api/v1/balances", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Korapay responded with ${response.status}.`);
  }

  return "Korapay connection verified.";
}

async function testEmailConnection(config: StoredIntegrationSetting) {
  const provider = config.provider ?? "resend";
  const apiKey = config.secrets.apiKey ? decryptSecret(config.secrets.apiKey) : "";

  if (!apiKey) {
    throw new Error("Save an email delivery API key before testing the connection.");
  }

  if (provider === "sendgrid") {
    const response = await fetch("https://api.sendgrid.com/v3/user/account", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`SendGrid responded with ${response.status}.`);
    }

    return "SendGrid connection verified.";
  }

  const response = await fetch("https://api.resend.com/domains", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Resend responded with ${response.status}.`);
  }

  return "Resend connection verified.";
}

async function testGoogleMapsConnection(config: StoredIntegrationSetting) {
  const apiKey = config.secrets.apiKey ? decryptSecret(config.secrets.apiKey) : "";

  if (!apiKey) {
    throw new Error("Save a Google Maps API key before testing the connection.");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=Vienna&key=${encodeURIComponent(apiKey)}`,
    {cache: "no-store"}
  );

  if (!response.ok) {
    throw new Error(`Google Maps responded with ${response.status}.`);
  }

  return "Google Maps connection verified.";
}

async function testExchangeRateConnection(config: StoredIntegrationSetting) {
  const apiKey = config.secrets.apiKey ? decryptSecret(config.secrets.apiKey) : "";

  if (!apiKey) {
    throw new Error("Save an exchange rate API key before testing the connection.");
  }

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/EUR`,
    {cache: "no-store"}
  );

  if (!response.ok) {
    throw new Error(`Exchange Rate API responded with ${response.status}.`);
  }

  return "Exchange Rate API connection verified.";
}

export async function testAdminIntegrationConnection({
  actor,
  key
}: {
  actor: AdminStaffIdentity;
  key: AdminIntegrationKey;
}) {
  assertOwner(actor);

  const settingMap = await readSettingMap([INTEGRATION_SETTING_KEYS[key]]);
  const current = parseStoredIntegrationSetting(settingMap.get(INTEGRATION_SETTING_KEYS[key]));
  const testedAt = new Date().toISOString();

  try {
    const message =
      key === "duffel"
      ? await testDuffelConnection(current)
      : key === "paystack"
        ? await testPaystackConnection(current)
        : key === "stripe"
          ? await testStripeConnection(current)
          : key === "flutterwave"
            ? await testFlutterwaveConnection(current)
            : key === "korapay"
              ? await testKorapayConnection(current)
              : key === "email_delivery"
                ? await testEmailConnection(current)
                : key === "google_maps"
                  ? await testGoogleMapsConnection(current)
                  : await testExchangeRateConnection(current);

    await upsertGlobalSetting({
      description: `Encrypted configuration for the ${INTEGRATION_METADATA[key].title} integration.`,
      key: INTEGRATION_SETTING_KEYS[key],
      value: {
        ...current,
        lastTestMessage: message,
        lastTestStatus: "connected",
        lastTestedAt: testedAt
      } satisfies StoredIntegrationSetting
    });

    await createAdminAuditLog({
      action: `admin.integration.${key}.tested`,
      actorRole: actor.role,
      actorUserId: actor.userId,
      entityType: "site_settings",
      metadata: {
        key,
        result: "connected"
      }
    });

    return {
      lastTestedAt: testedAt,
      message,
      status: "connected" as const
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify the integration.";

    await upsertGlobalSetting({
      description: `Encrypted configuration for the ${INTEGRATION_METADATA[key].title} integration.`,
      key: INTEGRATION_SETTING_KEYS[key],
      value: {
        ...current,
        lastTestMessage: message,
        lastTestStatus: "failed",
        lastTestedAt: testedAt
      } satisfies StoredIntegrationSetting
    });

    await createAdminAuditLog({
      action: `admin.integration.${key}.tested`,
      actorRole: actor.role,
      actorUserId: actor.userId,
      entityType: "site_settings",
      metadata: {
        key,
        message,
        result: "failed"
      }
    });

    return {
      lastTestedAt: testedAt,
      message,
      status: "failed" as const
    };
  }
}

export async function getAdminSiteSettingsData(): Promise<AdminSiteSettingsData> {
  const paymentProviderIntegrationKeys = ADMIN_PAYMENT_METHOD_KEYS.filter(
    (key): key is Exclude<AdminPaymentMethodKey, "bank_transfer"> => key !== "bank_transfer"
  );
  const settingMap = await readSettingMap([
    ...Object.values(SITE_SETTINGS_KEYS),
    ...paymentProviderIntegrationKeys.map((key) => INTEGRATION_SETTING_KEYS[key])
  ]);
  const generalSettings = normalizeSiteBranding(settingMap.get(SITE_SETTINGS_KEYS.general));
  const defaultEmailSettings = getDefaultEmailSettings(generalSettings);
  const storedEmailSettings = asRecord(settingMap.get(SITE_SETTINGS_KEYS.email));
  const storedEmailAutomations = asRecord(
    (storedEmailSettings.automations as Json | undefined) ?? {}
  );
  const emailSettings = {
    ...defaultEmailSettings,
    ...storedEmailSettings,
    automations: {
      ...defaultEmailSettings.automations,
      ...storedEmailAutomations
    }
  } as AdminEmailSettings;
  const paymentProviderCredentials = paymentProviderIntegrationKeys.map((key) => {
    const stored = parseStoredIntegrationSetting(settingMap.get(INTEGRATION_SETTING_KEYS[key]));
    return buildIntegrationView(key, stored);
  });

  return {
    booking: {
      ...getDefaultBookingSettings(),
      ...asRecord(settingMap.get(SITE_SETTINGS_KEYS.booking))
    } as AdminBookingSettings,
    access: normalizeCustomerAccessSettings(settingMap.get(SITE_SETTINGS_KEYS.access)),
    email: {
      ...emailSettings,
      footerText: rewriteDefaultBrandText(emailSettings.footerText, generalSettings),
      fromName: rewriteDefaultBrandText(emailSettings.fromName, generalSettings)
    },
    general: generalSettings,
    maintenance: {
      ...getDefaultMaintenanceSettings(),
      ...asRecord(settingMap.get(SITE_SETTINGS_KEYS.maintenance))
    } as AdminMaintenanceSettings,
    payment: normalizePaymentSettings(
      settingMap.get(SITE_SETTINGS_KEYS.payment),
      paymentProviderCredentials,
      generalSettings
    )
  };
}

export async function saveAdminSiteSettingsSection({
  actor,
  section,
  values
}: {
  actor: AdminStaffIdentity;
  section: AdminSiteSettingsSection;
  values:
    | AdminAccessSettings
    | AdminBookingSettings
    | AdminEmailSettings
    | AdminGeneralSettings
    | AdminMaintenanceSettings
    | AdminPaymentSettings;
}) {
  assertSettingsManager(actor);

  await upsertGlobalSetting({
    description: `Operational settings for the ${section} control center section.`,
    key: SITE_SETTINGS_KEYS[section],
    value: values
  });

  await createAdminAuditLog({
    action: `admin.site_settings.${section}.saved`,
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityType: "site_settings",
    metadata: {
      section
    }
  });
}

export async function getAdminUsersManagerData(): Promise<AdminUsersManagerData> {
  const authDirectory = await listAllAuthUsers();
  const userIds = authDirectory.users.map((user) => user.id);
  const rows = userIds.length > 0
    ? await fetchDirectoryRows(userIds)
    : {adminUsers: [], profiles: []};
  const profileMap = new Map(rows.profiles.map((profile) => [profile.user_id, profile]));
  const adminUserMap = new Map(rows.adminUsers.map((adminUser) => [adminUser.id, adminUser]));
  const users = authDirectory.users
    .map((user) => buildManagedUserRecord(
      user,
      profileMap.get(user.id) ?? null,
      adminUserMap.get(user.id) ?? null
    ))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });

  return {
    counts: {
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.accountType === "admin").length,
      customers: users.filter((user) => user.accountType === "customer").length,
      inactive: users.filter((user) => !user.isActive).length,
      total: authDirectory.total
    },
    users
  };
}

export async function inviteAdminUser({
  actor,
  email,
  role
}: {
  actor: AdminStaffIdentity;
  email: string;
  role: Extract<UserRole, "admin" | "owner" | "support">;
}) {
  assertOwner(actor);

  const admin = createSupabaseAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  const existingProfileResult = await admin
    .from("profiles")
    .select("user_id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();
  const existingProfile =
    (existingProfileResult.data as {email: string; user_id: string} | null) ?? null;

  if (existingProfile) {
    const updateResult = await admin
      .from("profiles")
      .update({
        is_suspended: false,
        role
      })
      .eq("user_id", existingProfile.user_id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    await createAdminAuditLog({
      action: "admin.user.reactivated",
      actorRole: actor.role,
      actorUserId: actor.userId,
      entityId: existingProfile.user_id,
      entityType: "profiles",
      metadata: {
        email: normalizedEmail,
        role
      },
      targetUserId: existingProfile.user_id
    });

    return;
  }

  const env = getServerEnv();
  const inviteResult = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/en/auth`
  });

  if (inviteResult.error || !inviteResult.data.user) {
    throw new Error(inviteResult.error?.message ?? "Unable to create the admin invitation.");
  }

  const upsertResult = await admin.from("profiles").upsert(
    {
      email: normalizedEmail,
      is_suspended: false,
      role,
      user_id: inviteResult.data.user.id
    },
    {onConflict: "user_id"}
  );

  if (upsertResult.error) {
    throw new Error(upsertResult.error.message);
  }

  await createAdminAuditLog({
    action: "admin.user.invited",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: inviteResult.data.user.id,
    entityType: "profiles",
    metadata: {
      email: normalizedEmail,
      role
    },
    targetUserId: inviteResult.data.user.id
  });
}

export async function createManagedUser({
  actor,
  email,
  fullName,
  password,
  phone,
  role
}: {
  actor: AdminStaffIdentity;
  email: string;
  fullName: string;
  password: string;
  phone?: string | null;
  role: AdminManagedUserRole;
}) {
  assertOwner(actor);

  const normalizedEmail = normalizeOptionalString(email)?.toLowerCase();
  const normalizedFullName = normalizeOptionalString(fullName);
  const normalizedPhone = normalizeOptionalString(phone ?? undefined) ?? null;

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!normalizedFullName) {
    throw new Error("Full name is required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (role !== "customer" && !isAdminRole(role)) {
    throw new Error("Invalid role provided.");
  }

  const admin = createSupabaseAdminClient();
  const {firstName, lastName} = splitFullName(normalizedFullName);
  const profileRole = mapManagedRoleToProfileRole(role);
  const accessSettings = await getCustomerAccessSettings();
  const authResult = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm:
      role === "customer"
        ? !accessSettings.customerLoginRequiresEmailConfirmation
        : true,
    password,
    phone: role === "customer" ? normalizedPhone ?? undefined : undefined,
    phone_confirm:
      role === "customer" && normalizedPhone
        ? !accessSettings.customerLoginRequiresSmsConfirmation
        : undefined,
    user_metadata: {
      first_name: firstName,
      full_name: normalizedFullName,
      last_name: lastName
    }
  });

  if (authResult.error || !authResult.data.user) {
    const message = authResult.error?.message ?? "Unable to create the auth user.";
    throw new Error(
      message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")
        ? "A user with that email already exists."
        : message
    );
  }

  const user = authResult.data.user;

  try {
    const profileResult = await admin.from("profiles").upsert(
      {
        email: normalizedEmail,
        first_name: firstName,
        is_suspended: false,
        last_name: lastName,
        phone: role === "customer" ? normalizedPhone : null,
        role: profileRole,
        suspended_at: null,
        user_id: user.id
      },
      {onConflict: "user_id"}
    );

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }

    if (role !== "customer") {
      const adminUserResult = await admin.from("admin_users").upsert(
        {
          created_by: actor.userId,
          email: normalizedEmail,
          full_name: normalizedFullName,
          id: user.id,
          is_active: true,
          role
        },
        {onConflict: "id"}
      );

      if (adminUserResult.error) {
        throw new Error(adminUserResult.error.message);
      }
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(user.id);
    throw error;
  }

  await createAdminAuditLog({
    action: "admin.user.created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: user.id,
    entityType: "profiles",
    metadata: {
      email: normalizedEmail,
      role
    },
    targetUserId: user.id
  });

  return {
    userId: user.id
  };
}

async function getManagedUserState(userId: string) {
  const admin = createSupabaseAdminClient();
  const [authUserResult, profileResult, adminUserResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("profiles")
      .select(
        "user_id, email, first_name, last_name, phone, role, created_at, last_signed_in_at, is_suspended"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("admin_users")
      .select("id, email, full_name, role, is_active, last_login, created_at, created_by")
      .eq("id", userId)
      .maybeSingle()
  ]);

  if (authUserResult.error || !authUserResult.data.user) {
    throw new Error("User not found.");
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (adminUserResult.error) {
    throw new Error(adminUserResult.error.message);
  }

  const profile = (profileResult.data as AdminDirectoryProfileRow | null) ?? null;
  const adminUser = (adminUserResult.data as AdminDirectoryAdminUserRow | null) ?? null;

  return {
    admin,
    adminUser,
    authUser: authUserResult.data.user,
    profile,
    role: resolveManagedRole(profile, adminUser)
  };
}

async function countActiveSuperAdmins() {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("admin_users")
    .select("id", {count: "exact", head: true})
    .eq("role", "super_admin")
    .eq("is_active", true);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.count ?? 0;
}

export async function updateManagedUser({
  actor,
  isActive,
  role,
  userId
}: {
  actor: AdminStaffIdentity;
  isActive: boolean;
  role: AdminManagedUserRole;
  userId: string;
}) {
  assertOwner(actor);

  if (role !== "customer" && !isAdminRole(role)) {
    throw new Error("Invalid role provided.");
  }

  if (userId === actor.userId && (!isActive || role !== "super_admin")) {
    throw new Error("You cannot deactivate or demote your own super admin account.");
  }

  const {
    admin,
    adminUser,
    authUser,
    profile,
    role: currentRole
  } = await getManagedUserState(userId);

  if (currentRole === "super_admin" && (role !== "super_admin" || !isActive)) {
    const activeSuperAdminCount = await countActiveSuperAdmins();

    if (activeSuperAdminCount <= 1) {
      throw new Error("At least one active super admin must remain.");
    }
  }

  const email = authUser.email ?? profile?.email ?? adminUser?.email;

  if (!email) {
    throw new Error("This user does not have an email address.");
  }

  const fullName =
    adminUser?.full_name ??
    joinFullName(profile?.first_name, profile?.last_name) ??
    getAuthUserFullName(authUser) ??
    email;
  const {firstName, lastName} = splitFullName(fullName);
  const profileRole = mapManagedRoleToProfileRole(role);
  const profileResult = await admin.from("profiles").upsert(
    {
      email,
      first_name: firstName,
      is_suspended: !isActive,
      last_name: lastName,
      phone: role === "customer" ? profile?.phone ?? null : null,
      role: profileRole,
      suspended_at: isActive ? null : new Date().toISOString(),
      user_id: userId
    },
    {onConflict: "user_id"}
  );

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (role === "customer") {
    const deleteAdminUserResult = await admin.from("admin_users").delete().eq("id", userId);

    if (deleteAdminUserResult.error) {
      throw new Error(deleteAdminUserResult.error.message);
    }
  } else {
    const upsertAdminUserResult = await admin.from("admin_users").upsert(
      {
        created_by: adminUser?.created_by ?? actor.userId,
        email,
        full_name: fullName,
        id: userId,
        is_active: isActive,
        role
      },
      {onConflict: "id"}
    );

    if (upsertAdminUserResult.error) {
      throw new Error(upsertAdminUserResult.error.message);
    }
  }

  if (isActive) {
    if (role === "customer") {
      await syncCustomerAuthConfirmationForSettings({userId});
    } else if (!authUser.email_confirmed_at) {
      const authUpdateResult = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true
      });

      if (authUpdateResult.error) {
        throw new Error(authUpdateResult.error.message);
      }
    }
  }

  await createAdminAuditLog({
    action: "admin.user.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: userId,
    entityType: "profiles",
    metadata: {
      isActive,
      role
    },
    targetUserId: userId
  });
}

async function countOwnerProfiles() {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("profiles")
    .select("user_id", {count: "exact", head: true})
    .eq("role", "owner")
    .is("deleted_at", null)
    .eq("is_suspended", false);

  return result.count ?? 0;
}

export async function updateAdminUser({
  actor,
  isActive,
  role,
  userId
}: {
  actor: AdminStaffIdentity;
  isActive: boolean;
  role: Extract<UserRole, "admin" | "owner" | "support">;
  userId: string;
}) {
  assertOwner(actor);

  if (userId === actor.userId && !isActive) {
    throw new Error("You cannot deactivate your own super admin account.");
  }

  if (userId === actor.userId && role !== "owner") {
    throw new Error("You cannot remove your own super admin role.");
  }

  const admin = createSupabaseAdminClient();
  const currentResult = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const currentRole = (currentResult.data as {role: UserRole} | null)?.role ?? null;

  if (currentRole === "owner" && role !== "owner") {
    const ownerCount = await countOwnerProfiles();

    if (ownerCount <= 1) {
      throw new Error("At least one super admin must remain active.");
    }
  }

  const updateResult = await admin
    .from("profiles")
    .update({
      is_suspended: !isActive,
      role
    })
    .eq("user_id", userId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  await createAdminAuditLog({
    action: "admin.user.updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: userId,
    entityType: "profiles",
    metadata: {
      isActive,
      role
    },
    targetUserId: userId
  });
}
