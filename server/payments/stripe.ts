import "server-only";

import Stripe from "stripe";

import {requireServerEnv} from "@/lib/env/server";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!stripe) {
    stripe = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"));
  }

  return stripe;
}

export function createIdempotencyKey(parts: string[]) {
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(":");
}
