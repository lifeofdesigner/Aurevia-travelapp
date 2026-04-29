import {createHmac, timingSafeEqual} from "crypto";
import {NextResponse} from "next/server";

import {reportServerError} from "@/server/observability/logger";
import {getRequiredPaymentProviderSecret} from "@/server/payments/payment-methods";
import {processKorapayWebhookEvent} from "@/server/payments/korapay-service";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function verifyKorapaySignature(
  event: {data?: Record<string, unknown>},
  signature: string | null
) {
  if (!signature) {
    throw new Error("Missing Korapay webhook signature.");
  }

  const secretKey = await getRequiredPaymentProviderSecret("korapay", "secretKey");
  const expected = createHmac("sha256", secretKey)
    .update(JSON.stringify(event.data ?? {}))
    .digest("hex");

  if (!safeCompare(signature, expected)) {
    throw new Error("Invalid Korapay webhook signature.");
  }

  return signature;
}

export async function POST(request: Request) {
  try {
    const event = (await request.json()) as {data?: Record<string, unknown>; event?: string};
    const signature = await verifyKorapaySignature(
      event,
      request.headers.get("x-korapay-signature")
    );

    await processKorapayWebhookEvent(event, signature);

    return NextResponse.json({received: true}, {status: 200});
  } catch (error) {
    reportServerError("payments.korapay.webhook_failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process the Korapay webhook."
      },
      {status: 400}
    );
  }
}
