import "server-only";

import {
  ADMIN_PAYMENT_METHOD_KEYS,
  type AdminPaymentMethodKey
} from "@/features/admin/lib/control-center-types";
import {type SupportedCurrency} from "@/lib/money";
import {
  getAdminIntegrationRuntimeConfig,
  getAdminSiteSettingsData
} from "@/server/admin/control-center-service";

export type OnlinePaymentProvider = Exclude<AdminPaymentMethodKey, "bank_transfer">;

export type CheckoutPaymentOption = {
  description: string;
  disabledReason: string | null;
  environment: "live" | "test" | null;
  isConfigured: boolean;
  key: AdminPaymentMethodKey;
  label: string;
  tag: string;
};

type ProviderFallbackEnv = Partial<Record<"publicKey" | "secretKey" | "webhookSecret", string>>;

const PROVIDER_FALLBACK_ENV: Record<OnlinePaymentProvider, ProviderFallbackEnv> = {
  flutterwave: {
    publicKey: "FLUTTERWAVE_PUBLIC_KEY",
    secretKey: "FLUTTERWAVE_SECRET_KEY",
    webhookSecret: "FLUTTERWAVE_WEBHOOK_SECRET"
  },
  korapay: {
    publicKey: "KORAPAY_PUBLIC_KEY",
    secretKey: "KORAPAY_SECRET_KEY"
  },
  paystack: {
    publicKey: "PAYSTACK_PUBLIC_KEY",
    secretKey: "PAYSTACK_SECRET_KEY"
  },
  stripe: {
    publicKey: "STRIPE_PUBLISHABLE_KEY",
    secretKey: "STRIPE_SECRET_KEY",
    webhookSecret: "STRIPE_WEBHOOK_SECRET"
  }
};

const PAYMENT_METHOD_LABELS: Record<
  AdminPaymentMethodKey,
  {description: string; label: string; tag: string}
> = {
  bank_transfer: {
    description: "Transfer directly to the business account and keep this booking pending until finance confirms receipt.",
    label: "Bank transfer",
    tag: "Manual"
  },
  flutterwave: {
    description: "Pay through Flutterwave hosted checkout with card, bank, mobile money, or local rails where supported.",
    label: "Flutterwave",
    tag: "Gateway"
  },
  korapay: {
    description: "Pay through Korapay checkout with card, bank transfer, Pay with Bank, or mobile money where supported.",
    label: "Korapay",
    tag: "Gateway"
  },
  paystack: {
    description: "Pay with Nigerian cards, bank transfer, USSD, or other Paystack channels for NGN bookings.",
    label: "Paystack",
    tag: "Nigeria"
  },
  stripe: {
    description: "Pay securely with international cards through Stripe Checkout.",
    label: "Card",
    tag: "International"
  }
};

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getFallbackSecret(provider: OnlinePaymentProvider, fieldName: keyof ProviderFallbackEnv) {
  const envKey = PROVIDER_FALLBACK_ENV[provider][fieldName];
  return envKey ? normalizeOptionalString(process.env[envKey]) : null;
}

function isKnownPaymentMethod(value: string): value is AdminPaymentMethodKey {
  return ADMIN_PAYMENT_METHOD_KEYS.includes(value as AdminPaymentMethodKey);
}

export async function getPaymentSettingsForCheckout() {
  const settings = await getAdminSiteSettingsData();

  return {
    bankTransferDetails: settings.payment.bankTransferDetails,
    paymentMethods: settings.payment.paymentMethods.filter(isKnownPaymentMethod)
  };
}

export async function isPaymentMethodEnabled(method: AdminPaymentMethodKey) {
  const settings = await getPaymentSettingsForCheckout();
  return settings.paymentMethods.includes(method);
}

export async function getPaymentProviderRuntimeConfig(provider: OnlinePaymentProvider) {
  const stored = await getAdminIntegrationRuntimeConfig(provider);
  const secrets = {
    publicKey: stored.secrets.publicKey ?? getFallbackSecret(provider, "publicKey"),
    secretKey: stored.secrets.secretKey ?? getFallbackSecret(provider, "secretKey"),
    webhookSecret: stored.secrets.webhookSecret ?? getFallbackSecret(provider, "webhookSecret")
  };

  return {
    environment: stored.environment,
    secrets
  };
}

export async function getRequiredPaymentProviderSecret(
  provider: OnlinePaymentProvider,
  fieldName: "publicKey" | "secretKey" | "webhookSecret"
) {
  const config = await getPaymentProviderRuntimeConfig(provider);
  const value = config.secrets[fieldName];

  if (!value) {
    throw new Error(
      `${PAYMENT_METHOD_LABELS[provider].label} ${fieldName.replace("Key", " key")} is not configured.`
    );
  }

  return value;
}

async function isOnlineProviderConfigured(provider: OnlinePaymentProvider) {
  const config = await getPaymentProviderRuntimeConfig(provider);
  return Boolean(config.secrets.secretKey);
}

export async function getCheckoutPaymentOptions(
  currency: SupportedCurrency
): Promise<CheckoutPaymentOption[]> {
  const settings = await getPaymentSettingsForCheckout();

  return Promise.all(
    settings.paymentMethods.map(async (method) => {
      const metadata = PAYMENT_METHOD_LABELS[method];

      if (method === "bank_transfer") {
        return {
          ...metadata,
          disabledReason: settings.bankTransferDetails.trim()
            ? null
            : "Bank transfer details have not been configured yet.",
          environment: null,
          isConfigured: Boolean(settings.bankTransferDetails.trim()),
          key: method
        };
      }

      const config = await getPaymentProviderRuntimeConfig(method);
      const isConfigured = Boolean(config.secrets.secretKey);
      const currencyBlocked =
        method === "paystack" && currency !== "NGN"
          ? "Paystack is available for NGN bookings only."
          : null;

      return {
        ...metadata,
        disabledReason: currencyBlocked ?? (isConfigured ? null : `${metadata.label} keys are not configured yet.`),
        environment: config.environment,
        isConfigured,
        key: method
      };
    })
  );
}

export async function requireEnabledPaymentMethod(method: AdminPaymentMethodKey) {
  if (!(await isPaymentMethodEnabled(method))) {
    throw new Error(`${PAYMENT_METHOD_LABELS[method].label} is not active in Admin Settings.`);
  }

  if (method !== "bank_transfer" && !(await isOnlineProviderConfigured(method))) {
    throw new Error(`${PAYMENT_METHOD_LABELS[method].label} keys are not configured yet.`);
  }
}

export function getPaymentMethodLabel(method: AdminPaymentMethodKey) {
  return PAYMENT_METHOD_LABELS[method].label;
}
