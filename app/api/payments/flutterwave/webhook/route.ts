import {createHmac, timingSafeEqual} from "crypto";
import {NextResponse} from "next/server";

import {reportServerError} from "@/server/observability/logger";
import {getPaymentProviderRuntimeConfig} from "@/server/payments/payment-methods";
import {processFlutterwaveWebhookEvent} from "@/server/payments/flutterwave-service";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function verifyFlutterwaveSignature(rawBody: string, request: Request) {
  const config = await getPaymentProviderRuntimeConfig("flutterwave");
  const webhookSecret = config.secrets.webhookSecret;

  if (!webhookSecret) {
    throw new Error("Flutterwave webhook secret is not configured.");
  }

  const legacyHash = request.headers.get("verif-hash");

  if (legacyHash && safeCompare(legacyHash, webhookSecret)) {
    return legacyHash;
  }

  const hmacSignature = request.headers.get("flutterwave-signature");

  if (!hmacSignature) {
    throw new Error("Missing Flutterwave webhook signature.");
  }

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  if (!safeCompare(hmacSignature, expected)) {
    throw new Error("Invalid Flutterwave webhook signature.");
  }

  return hmacSignature;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = await verifyFlutterwaveSignature(rawBody, request);
    const event = JSON.parse(rawBody) as {data?: Record<string, unknown>; event?: string};

    await processFlutterwaveWebhookEvent(event, signature);

    return NextResponse.json({received: true}, {status: 200});
  } catch (error) {
    reportServerError("payments.flutterwave.webhook_failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process the Flutterwave webhook."
      },
      {status: 400}
    );
  }
}
