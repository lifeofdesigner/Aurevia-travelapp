import "server-only";

import Stripe from "stripe";

import {requireServerEnv} from "@/lib/env/server";
import {getRequiredPaymentProviderSecret} from "@/server/payments/payment-methods";

let stripe: Stripe | null = null;
let configuredStripe: {client: Stripe; secretKey: string} | null = null;

export function getStripeClient() {
  if (!stripe) {
    stripe = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"));
  }

  return stripe;
}

export async function getConfiguredStripeClient() {
  const secretKey = await getRequiredPaymentProviderSecret("stripe", "secretKey");

  if (!configuredStripe || configuredStripe.secretKey !== secretKey) {
    configuredStripe = {
      client: new Stripe(secretKey),
      secretKey
    };
  }

  return configuredStripe.client;
}

export function createIdempotencyKey(parts: string[]) {
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(":");
}
