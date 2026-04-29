import {type NextRequest, NextResponse} from "next/server";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {reportServerError} from "@/server/observability/logger";
import {getRequiredPaymentProviderSecret} from "@/server/payments/payment-methods";
import {getConfiguredStripeClient} from "@/server/payments/stripe";
import {processStripeWebhookEvent} from "@/server/payments/webhook-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    const response = NextResponse.json(
      {
        message: "Missing Stripe signature."
      },
      {status: 400}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }

  try {
    const payload = await request.text();
    const [stripe, webhookSecret] = await Promise.all([
      getConfiguredStripeClient(),
      getRequiredPaymentProviderSecret("stripe", "webhookSecret")
    ]);
    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      const response = NextResponse.json(
        {
          message: "Invalid Stripe webhook signature."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      reportServerError("stripe.webhook.signature_invalid", error);
      return response;
    }

    const result = await processStripeWebhookEvent(event, signature);
    const response = NextResponse.json(
      {
        duplicate: result.duplicate,
        status: result.status
      },
      {status: 200}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    reportServerError("stripe.webhook.processing_failed", error);
    const response = NextResponse.json(
      {
        message: "Unable to process the Stripe webhook."
      },
      {status: 500}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
