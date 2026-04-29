"use client";

import {useCallback, useEffect, useState} from "react";
import Script from "next/script";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";

declare global {
  interface Window {
    Korapay?: {
      initialize: (config: {
        amount: number;
        currency: string;
        customer: {
          email: string;
          name: string;
        };
        key: string;
        metadata: Record<string, unknown>;
        notification_url: string;
        onClose: () => void;
        onFailed: () => void;
        onPending: () => void;
        onSuccess: () => void;
        reference: string;
      }) => void;
    };
  }
}

type KorapayCheckoutClientProps = {
  amount: number;
  bookingId: string;
  currency: string;
  customerEmail: string;
  customerName: string;
  locale: Locale;
  notificationUrl: string;
  publicKey: string;
  reference: string;
};

export function KorapayCheckoutClient({
  amount,
  bookingId,
  currency,
  customerEmail,
  customerName,
  locale,
  notificationUrl,
  publicKey,
  reference
}: KorapayCheckoutClientProps) {
  const router = useRouter();
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPayment = useCallback(async () => {
    setIsVerifying(true);

    try {
      const response = await fetch(
        `/api/payments/korapay/verify?reference=${encodeURIComponent(reference)}`
      );
      const payload = (await response.json()) as {message?: string; status?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to verify the Korapay payment.");
      }

      if (payload.status !== "success") {
        throw new Error(payload.message ?? "Korapay has not confirmed this payment yet.");
      }

      router.replace(`/${locale}/payments/success?session_id=${encodeURIComponent(reference)}`);
    } catch (error) {
      toast.error("Unable to verify payment", {
        description: error instanceof Error ? error.message : "Please try again."
      });
      setIsVerifying(false);
    }
  }, [locale, reference, router]);

  const openKorapay = useCallback(() => {
    if (!window.Korapay) {
      toast.error("Korapay is still loading", {
        description: "Please try again in a moment."
      });
      return;
    }

    window.Korapay.initialize({
      amount,
      currency,
      customer: {
        email: customerEmail,
        name: customerName
      },
      key: publicKey,
      metadata: {
        bookingId,
        locale
      },
      notification_url: notificationUrl,
      onClose: () => {
        toast.message("Korapay checkout closed");
      },
      onFailed: () => {
        toast.error("Korapay payment failed", {
          description: "No charge was confirmed for this booking."
        });
      },
      onPending: () => {
        toast.message("Korapay payment pending", {
          description: "We will update the booking once Korapay confirms the payment."
        });
      },
      onSuccess: () => {
        void verifyPayment();
      },
      reference
    });
  }, [
    amount,
    bookingId,
    currency,
    customerEmail,
    customerName,
    locale,
    notificationUrl,
    publicKey,
    reference,
    verifyPayment
  ]);

  useEffect(() => {
    if (isScriptReady) {
      openKorapay();
    }
  }, [isScriptReady, openKorapay]);

  return (
    <>
      <Script
        src="https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />
      <Button
        className="rounded-lg px-6"
        disabled={!isScriptReady || isVerifying}
        onClick={openKorapay}
        type="button"
      >
        {isVerifying ? "Verifying..." : isScriptReady ? "Open Korapay checkout" : "Loading Korapay..."}
      </Button>
    </>
  );
}
