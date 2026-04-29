"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

type PaystackCallbackStatusProps = {
  bookingId: string | null;
  locale: string;
  reference: string;
};

export function PaystackCallbackStatus({
  bookingId,
  locale,
  reference
}: PaystackCallbackStatusProps) {
  const router = useRouter();
  const [message, setMessage] = useState("We are confirming your Paystack payment now.");
  const [status, setStatus] = useState<"error" | "success" | "verifying">("verifying");

  useEffect(() => {
    let isMounted = true;

    async function verifyPayment() {
      try {
        const response = await fetch(
          `/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`
        );
        const payload = (await response.json()) as {
          bookingId?: string;
          message?: string;
          status?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to verify the Paystack payment.");
        }

        if (!isMounted) {
          return;
        }

        if (payload.status === "success") {
          setStatus("success");
          setMessage(payload.message ?? "Payment verified successfully. Redirecting...");
          window.setTimeout(() => {
            router.replace(`/${locale}/payments/success?session_id=${encodeURIComponent(reference)}`);
          }, 1200);
          return;
        }

        setStatus("error");
        setMessage(payload.message ?? "Payment is not yet confirmed.");
        window.setTimeout(() => {
          router.replace(
            bookingId
              ? `/${locale}/payments/cancel?bookingId=${encodeURIComponent(bookingId)}`
              : `/${locale}/checkout`
          );
        }, 1800);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to verify the payment.");
      }
    }

    void verifyPayment();

    return () => {
      isMounted = false;
    };
  }, [bookingId, locale, reference, router]);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Paystack
      </p>
      <h2 className="mt-3 font-display text-3xl italic text-foreground">
        {status === "verifying"
          ? "Verifying payment"
          : status === "success"
            ? "Payment confirmed"
            : "Verification issue"}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-text-muted">
        Reference: {reference}
      </p>
    </div>
  );
}
