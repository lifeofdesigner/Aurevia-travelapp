import {createHmac, timingSafeEqual} from "crypto";
import {type NextRequest, NextResponse} from "next/server";

import {applyPrivateRouteHeaders} from "@/lib/http/security";
import {reportServerError} from "@/server/observability/logger";
import {getRequiredPaymentProviderSecret} from "@/server/payments/payment-methods";
import {processPaystackWebhookEvent} from "@/server/payments/paystack-service";

export const runtime = "nodejs";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-paystack-signature");
    const payload = await request.text();

    if (!signature) {
      const response = NextResponse.json(
        {
          message: "Missing Paystack signature."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const secretKey = await getRequiredPaymentProviderSecret("paystack", "secretKey");
    const expectedSignature = createHmac("sha512", secretKey)
      .update(payload)
      .digest("hex");

    if (!safeCompare(expectedSignature, signature)) {
      const response = NextResponse.json(
        {
          message: "Invalid Paystack webhook signature."
        },
        {status: 400}
      );
      applyPrivateRouteHeaders(response.headers);
      return response;
    }

    const event = JSON.parse(payload) as {data?: Record<string, unknown>; event?: string};

    queueMicrotask(() => {
      void processPaystackWebhookEvent(event, signature).catch((error) => {
        reportServerError("paystack.webhook.background_failed", error);
      });
    });

    const response = NextResponse.json({received: true}, {status: 200});
    applyPrivateRouteHeaders(response.headers);
    return response;
  } catch (error) {
    reportServerError("paystack.webhook.processing_failed", error);
    const response = NextResponse.json(
      {
        message: "Unable to process the Paystack webhook."
      },
      {status: 500}
    );
    applyPrivateRouteHeaders(response.headers);
    return response;
  }
}
