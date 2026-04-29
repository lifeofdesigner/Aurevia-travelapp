"use client";

import {useMutation} from "@tanstack/react-query";
import {ArrowRight} from "lucide-react";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";

type CheckoutLaunchButtonProps = {
  bookingId: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  locale: Locale;
  provider?: "bank_transfer" | "flutterwave" | "korapay" | "paystack" | "stripe";
};

type CheckoutLaunchResponse = {
  checkoutUrl: string;
};

const pendingLabels: Record<
  NonNullable<CheckoutLaunchButtonProps["provider"]>,
  string
> = {
  bank_transfer: "Preparing bank transfer...",
  flutterwave: "Opening Flutterwave...",
  korapay: "Opening Korapay...",
  paystack: "Opening Paystack...",
  stripe: "Opening card checkout..."
};

async function createCheckoutSession(
  bookingId: string,
  locale: Locale,
  provider: "bank_transfer" | "flutterwave" | "korapay" | "paystack" | "stripe"
) {
  const endpoint =
    provider === "paystack"
      ? "/api/payments/paystack/initialize"
      : provider === "bank_transfer"
        ? "/api/payments/bank-transfer/initialize"
        : provider === "flutterwave"
          ? "/api/payments/flutterwave/initialize"
          : provider === "korapay"
            ? "/api/payments/korapay/initialize"
            : "/api/payments/checkout";
  const response = await fetch(endpoint, {
    body: JSON.stringify(
      provider === "paystack" || provider === "bank_transfer"
        ? {
            bookingId
          }
        : {
            bookingId,
            locale
          }
    ),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = (await response.json()) as
    | {message?: string}
    | CheckoutLaunchResponse;

  if (!response.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : "Unable to start payment."
    );
  }

  return body as CheckoutLaunchResponse;
}

export function CheckoutLaunchButton({
  bookingId,
  className,
  disabled = false,
  label,
  locale,
  provider = "stripe"
}: CheckoutLaunchButtonProps) {
  const t = useTranslations("Payments.checkout");
  const mutation = useMutation({
    mutationFn: () => createCheckoutSession(bookingId, locale, provider),
    onError: (error) => {
      toast.error(t("errorTitle"), {
        description: error.message
      });
    },
    onSuccess: (result) => {
      window.location.assign(result.checkoutUrl);
    }
  });

  return (
    <Button
      type="button"
      className={className}
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? pendingLabels[provider] ?? t("launching") : label ?? t("launchAction")}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}
