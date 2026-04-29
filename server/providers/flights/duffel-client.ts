import "server-only";

import {Duffel} from "@duffel/api";

function normalizeDuffelToken(value: string | undefined) {
  const token = value?.trim();

  if (!token || token.includes("[your token]")) {
    return undefined;
  }

  return token;
}

export function getDuffelAccessToken() {
  return normalizeDuffelToken(process.env.DUFFEL_ACCESS_TOKEN);
}

export function hasDuffelAccessToken() {
  return Boolean(getDuffelAccessToken());
}

export const duffel = new Duffel({
  token: process.env.DUFFEL_ACCESS_TOKEN ?? ""
});
