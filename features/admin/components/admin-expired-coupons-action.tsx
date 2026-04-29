"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";

export function AdminExpiredCouponsAction() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDeleteExpiredCoupons() {
    setIsPending(true);

    try {
      const response = await fetch("/api/admin/coupons/expired", {
        method: "POST"
      });
      const payload = (await response.json()) as {deletedCount?: number; message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to delete expired coupons.");
      }

      toast.success("Expired coupons cleaned up", {
        description:
          payload.deletedCount && payload.deletedCount > 0
            ? `${payload.deletedCount} expired coupon${payload.deletedCount === 1 ? "" : "s"} removed.`
            : "No expired coupons needed removal."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to delete expired coupons", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
      disabled={isPending}
      onClick={handleDeleteExpiredCoupons}
      type="button"
    >
      {isPending ? "Deleting..." : "Delete expired codes"}
    </Button>
  );
}
