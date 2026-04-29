"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";

type AdminVisaTemplateResponseFormProps = {
  applicationId: string;
};

const templateOptions = [
  {label: "Approved", value: "approved"},
  {label: "Needs changes", value: "needs_changes"},
  {label: "Rejected", value: "rejected"},
  {label: "General update", value: "submitted_update"}
] as const;

export function AdminVisaTemplateResponseForm({
  applicationId
}: AdminVisaTemplateResponseFormProps) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState<(typeof templateOptions)[number]["value"]>("submitted_update");
  const [customMessage, setCustomMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch(
        `/api/admin/visa-applications/${applicationId}/template-response`,
        {
          body: JSON.stringify({
            customMessage: customMessage.trim() || null,
            templateKey
          }),
          headers: {"Content-Type": "application/json"},
          method: "POST"
        }
      );
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to send the template response.");
      }

      toast.success("Template response sent", {
        description: "The applicant has been emailed from the visa review queue."
      });
      setCustomMessage("");
      router.refresh();
    } catch (error) {
      toast.error("Unable to send template response", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={`visa-template-${applicationId}`}>Response template</Label>
        <Select
          id={`visa-template-${applicationId}`}
          onChange={(event) =>
            setTemplateKey(event.target.value as (typeof templateOptions)[number]["value"])
          }
          value={templateKey}
        >
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`visa-template-message-${applicationId}`}>Custom message</Label>
        <Textarea
          id={`visa-template-message-${applicationId}`}
          onChange={(event) => setCustomMessage(event.target.value)}
          placeholder="Optional additional guidance for the applicant"
          value={customMessage}
        />
      </div>
      <Button
        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sending..." : "Send template response"}
      </Button>
    </form>
  );
}
