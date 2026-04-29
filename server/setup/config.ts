import "server-only";

import {type NextRequest} from "next/server";

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export type SetupRuntimeConfig = {
  canUseSetup: boolean;
  enabled: boolean;
  hasSecret: boolean;
  secretKey?: string;
};

export function getSetupRuntimeConfig(): SetupRuntimeConfig {
  const secretKey = normalizeOptionalString(process.env.SETUP_SECRET_KEY);
  const enabled = process.env.SETUP_ENABLED === "true";

  return {
    canUseSetup: enabled && Boolean(secretKey),
    enabled,
    hasSecret: Boolean(secretKey),
    secretKey
  };
}

export function getSetupSecretFromRequest(request: NextRequest | Request) {
  return normalizeOptionalString(
    request.headers.get("x-setup-secret-key") ??
      request.headers.get("X-Setup-Secret-Key") ??
      undefined
  );
}

export function isValidSetupSecret(secretKey: string | undefined) {
  const config = getSetupRuntimeConfig();

  if (!config.canUseSetup || !config.secretKey) {
    return false;
  }

  return secretKey === config.secretKey;
}
