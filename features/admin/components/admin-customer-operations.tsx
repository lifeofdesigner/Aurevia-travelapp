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
import {Textarea} from "@/components/ui/textarea";

type AdminCustomerOperationsProps = {
  canManageCustomer: boolean;
  customerEmail: string;
  customerName: string;
  isSuspended: boolean;
  siteName: string;
  userId: string;
};

export function AdminCustomerOperations({
  canManageCustomer,
  customerEmail,
  customerName,
  isSuspended,
  siteName,
  userId
}: AdminCustomerOperationsProps) {
  const router = useRouter();
  const [nextSuspendedState, setNextSuspendedState] = useState(isSuspended);
  const [emailSubject, setEmailSubject] = useState(`Update from ${siteName}`);
  const [emailMessage, setEmailMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isSuspendPending, setIsSuspendPending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);

  async function handleSuspensionToggle() {
    setIsSuspendPending(true);

    try {
      const response = await fetch(`/api/admin/customers/${userId}`, {
        body: JSON.stringify({isSuspended: nextSuspendedState}),
        headers: {"Content-Type": "application/json"},
        method: "PATCH"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update customer access.");
      }

      toast.success(nextSuspendedState ? "Customer suspended" : "Customer reactivated", {
        description: `${customerName} is now ${nextSuspendedState ? "suspended" : "active"}.`
      });
      router.refresh();
    } catch (error) {
      setNextSuspendedState((current) => !current);
      toast.error("Unable to update customer access", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsSuspendPending(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEmailPending(true);

    try {
      const response = await fetch(`/api/admin/customers/${userId}/email`, {
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

  if (!canManageCustomer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
            Customer controls
          </CardTitle>
          <CardDescription className="text-sm leading-7 text-[#56705f]">
            Suspend or reactivate this account without removing the customer profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-[#56705f]">
            <input
              checked={nextSuspendedState}
              className="h-4 w-4 rounded border-[#e8e0d0]"
              onChange={(event) => setNextSuspendedState(event.target.checked)}
              type="checkbox"
            />
            <span>Suspend this customer account</span>
          </label>
          <Button
            className={
              nextSuspendedState
                ? "bg-[#d32222] text-white hover:bg-[#b11b1b]"
                : "bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            }
            disabled={isSuspendPending}
            onClick={handleSuspensionToggle}
            type="button"
          >
            {isSuspendPending
              ? "Saving..."
              : nextSuspendedState
                ? "Suspend customer"
                : "Reactivate customer"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
            Send email
          </CardTitle>
          <CardDescription className="text-sm leading-7 text-[#56705f]">
            Contact {customerName} directly from the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-customer-email-subject">Subject</Label>
              <Input
                id="admin-customer-email-subject"
                onChange={(event) => setEmailSubject(event.target.value)}
                value={emailSubject}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-customer-email-reply-to">Reply-to email</Label>
              <Input
                id="admin-customer-email-reply-to"
                onChange={(event) => setReplyTo(event.target.value)}
                placeholder="Optional reply-to address"
                type="email"
                value={replyTo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-customer-email-message">Message</Label>
              <Textarea
                id="admin-customer-email-message"
                onChange={(event) => setEmailMessage(event.target.value)}
                placeholder="Write the customer-facing message here"
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
    </div>
  );
}
