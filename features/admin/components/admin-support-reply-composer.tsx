"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

type AdminSupportReplyComposerProps = {
  ticketId: string;
};

export function AdminSupportReplyComposer({
  ticketId
}: AdminSupportReplyComposerProps) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/messages`, {
        body: JSON.stringify({
          messageBody,
          replyTo: replyTo.trim() || null
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to send the support reply.");
      }

      toast.success("Reply sent", {
        description: "The customer reply has been stored and emailed."
      });
      setReplyTo("");
      setMessageBody("");
      router.refresh();
    } catch (error) {
      toast.error("Unable to send reply", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={`support-reply-to-${ticketId}`}>Reply-to email</Label>
        <Input
          id={`support-reply-to-${ticketId}`}
          onChange={(event) => setReplyTo(event.target.value)}
          placeholder="Optional reply-to address"
          type="email"
          value={replyTo}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`support-reply-message-${ticketId}`}>Reply message</Label>
        <Textarea
          id={`support-reply-message-${ticketId}`}
          onChange={(event) => setMessageBody(event.target.value)}
          placeholder="Write the customer-facing update here"
          required
          value={messageBody}
        />
      </div>
      <Button
        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sending..." : "Send customer reply"}
      </Button>
    </form>
  );
}
