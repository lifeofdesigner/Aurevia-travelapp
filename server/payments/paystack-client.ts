import "server-only";

import {getRequiredPaymentProviderSecret} from "@/server/payments/payment-methods";

type PaystackApiEnvelope<T> = {
  data: T;
  message: string;
  status: boolean;
};

type PaystackInitializeResponseData = {
  access_code: string;
  authorization_url: string;
  reference: string;
};

type PaystackTransactionCustomer = {
  email: string | null;
};

type PaystackTransactionData = {
  amount: number;
  currency: string;
  customer: PaystackTransactionCustomer | null;
  fees?: number | null;
  gateway_response: string | null;
  id: number;
  metadata: Record<string, unknown> | string | null;
  paid_at: string | null;
  reference: string;
  status: string;
};

type PaystackRefundData = {
  amount: number;
  currency: string;
  id: number;
  status: string;
  transaction?: number | string | Record<string, unknown> | null;
};

async function callPaystack<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const secretKey = await getRequiredPaymentProviderSecret("paystack", "secretKey");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const payload = (await response.json()) as PaystackApiEnvelope<T> & {message?: string};

  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? `Paystack request failed with ${response.status}.`);
  }

  return payload.data;
}

export async function initializeTransaction(
  email: string,
  amountInKobo: number,
  currency: string,
  metadata: Record<string, unknown>,
  callbackUrl: string,
  reference: string
) {
  return callPaystack<PaystackInitializeResponseData>("/transaction/initialize", {
    body: JSON.stringify({
      amount: String(amountInKobo),
      callback_url: callbackUrl,
      currency,
      email,
      metadata,
      reference
    }),
    method: "POST"
  });
}

export async function verifyTransaction(reference: string) {
  return callPaystack<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET"
    }
  );
}

export async function refundTransaction(transactionId: number | string, amountInKobo?: number) {
  return callPaystack<PaystackRefundData>("/refund", {
    body: JSON.stringify({
      amount: amountInKobo,
      transaction: transactionId
    }),
    method: "POST"
  });
}
