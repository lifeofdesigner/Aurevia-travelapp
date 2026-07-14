"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {formatMoney, type SupportedCurrency} from "@/lib/money";
import {type BookingStatus, type PaymentStatus} from "@/types/database-enums";

const managedBookingStatuses: BookingStatus[] = [
  "draft",
  "pending",
  "pending_payment",
  "confirmed",
  "partially_confirmed",
  "cancelled",
  "expired"
];

type AdminBookingOperationsProps = {
  bookingId: string;
  bookingReference: string;
  canEditBooking: boolean;
  canEmailCustomer: boolean;
  canRefundBooking: boolean;
  currency: SupportedCurrency;
  customerEmail: string;
  currentStatus: BookingStatus;
  locale: string;
  paymentAmountCapturedMinor: number;
  paymentAmountRefundedMinor: number;
  paymentStatus: PaymentStatus;
};

export function AdminBookingOperations({
  bookingId,
  bookingReference,
  canEditBooking,
  canEmailCustomer,
  canRefundBooking,
  currency,
  customerEmail,
  currentStatus,
  locale,
  paymentAmountCapturedMinor,
  paymentAmountRefundedMinor,
  paymentStatus
}: AdminBookingOperationsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<BookingStatus>(currentStatus);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [emailSubject, setEmailSubject] = useState(`Update about booking ${bookingReference}`);
  const [emailMessage, setEmailMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isStatusPending, setIsStatusPending] = useState(false);
  const [isBankTransferConfirmPending, setIsBankTransferConfirmPending] = useState(false);
  const [isManualConfirmPending, setIsManualConfirmPending] = useState(false);
  const [isRefundPending, setIsRefundPending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);

  const remainingRefundableMinor = Math.max(
    0,
    paymentAmountCapturedMinor - paymentAmountRefundedMinor
  );

  async function handleStatusUpdate() {
    setIsStatusPending(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        body: JSON.stringify({status}),
        headers: {"Content-Type": "application/json"},
        method: "PATCH"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update booking status.");
      }

      toast.success("Booking status updated", {
        description: `The booking is now marked as ${status.replaceAll("_", " ")}.`
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update booking status", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsStatusPending(false);
    }
  }

  async function handleBankTransferConfirm() {
    setIsBankTransferConfirmPending(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/bank-transfer/confirm`, {
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to confirm the bank transfer.");
      }

      toast.success("Bank transfer confirmed", {
        description: "The booking has been marked paid and confirmed."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to confirm bank transfer", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsBankTransferConfirmPending(false);
    }
  }

  async function handleManualPaymentConfirm() {
    setIsManualConfirmPending(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/payment/confirm`, {
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to confirm payment.");
      }

      toast.success("Payment confirmed", {
        description: "The booking is now marked as paid and confirmed. A confirmation email has been sent to the customer."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to confirm payment", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsManualConfirmPending(false);
    }
  }

  async function handleRefundSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRefundPending(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/refund`, {
        body: JSON.stringify({
          amountMajor: refundAmount.trim() ? Number(refundAmount) : null,
          reason: refundReason.trim() || null
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {
        message?: string;
        result?: {refundStatus?: string};
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to issue the refund.");
      }

      toast.success("Refund submitted", {
        description:
          payload.result?.refundStatus === "pending"
            ? "The refund is pending provider confirmation."
            : "The refund has been recorded successfully."
      });
      setRefundAmount("");
      setRefundReason("");
      router.refresh();
    } catch (error) {
      toast.error("Unable to issue refund", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsRefundPending(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEmailPending(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/email`, {
        body: JSON.stringify({
          message: emailMessage,
          replyTo: replyTo.trim() || null,
          subject: emailSubject
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to send the customer email.");
      }

      toast.success("Customer email sent", {
        description: `The message was delivered to ${customerEmail}.`
      });
      setEmailMessage("");
      router.refresh();
    } catch (error) {
      toast.error("Unable to send customer email", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsEmailPending(false);
    }
  }

  if (!canEditBooking && !canRefundBooking && !canEmailCustomer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {canEditBooking ? (
        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Booking controls
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Update booking status and keep the customer informed directly from the booking record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-booking-status">Booking status</Label>
              <Select
                id="admin-booking-status"
                onChange={(event) => setStatus(event.target.value as BookingStatus)}
                value={status}
              >
                {managedBookingStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={isStatusPending}
              onClick={handleStatusUpdate}
              type="button"
            >
              {isStatusPending ? "Saving..." : "Save status"}
            </Button>
            {paymentStatus === "requires_action" && paymentAmountCapturedMinor <= 0 ? (
              <Button
                className="ml-3 bg-[#c9a84c] text-[#1c3d2e] hover:bg-[#b99536]"
                disabled={isBankTransferConfirmPending}
                onClick={handleBankTransferConfirm}
                type="button"
              >
                {isBankTransferConfirmPending ? "Confirming..." : "Confirm bank transfer paid"}
              </Button>
            ) : null}
            {paymentStatus !== "paid" ? (
              <Button
                className="ml-3 border border-[#1c3d2e] bg-white text-[#1c3d2e] hover:bg-[#f0f5f2]"
                disabled={isManualConfirmPending}
                onClick={handleManualPaymentConfirm}
                type="button"
              >
                {isManualConfirmPending ? "Confirming..." : "Manually confirm payment"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canRefundBooking ? (
        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Refunds
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Remaining refundable balance:{" "}
              {formatMoney(
                {amountMinor: remainingRefundableMinor, currency},
                locale
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRefundSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-refund-amount">Refund amount</Label>
                <Input
                  id="admin-refund-amount"
                  min="0"
                  onChange={(event) => setRefundAmount(event.target.value)}
                  placeholder="Leave blank for full remaining balance"
                  step="0.01"
                  type="number"
                  value={refundAmount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-refund-reason">Reason</Label>
                <Textarea
                  id="admin-refund-reason"
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="Optional internal explanation for the refund"
                  value={refundReason}
                />
              </div>
              <Button
                className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                disabled={isRefundPending || remainingRefundableMinor <= 0}
                type="submit"
              >
                {isRefundPending ? "Processing refund..." : "Issue refund"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canEmailCustomer ? (
        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Customer email
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Send a manual message to {customerEmail}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-email-subject">Subject</Label>
                <Input
                  id="admin-email-subject"
                  onChange={(event) => setEmailSubject(event.target.value)}
                  value={emailSubject}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email-reply-to">Reply-to email</Label>
                <Input
                  id="admin-email-reply-to"
                  onChange={(event) => setReplyTo(event.target.value)}
                  placeholder="Optional reply-to address"
                  type="email"
                  value={replyTo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email-message">Message</Label>
                <Textarea
                  id="admin-email-message"
                  onChange={(event) => setEmailMessage(event.target.value)}
                  placeholder="Write the customer-facing update here"
                  required
                  value={emailMessage}
                />
              </div>
              <Button
                className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                disabled={isEmailPending}
                type="submit"
              >
                {isEmailPending ? "Sending..." : "Send email"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
