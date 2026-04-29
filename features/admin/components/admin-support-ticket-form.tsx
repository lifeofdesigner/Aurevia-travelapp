"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {type AdminSelectOption} from "@/features/admin/types";

type AdminSupportTicketFormProps = {
  adminOptions: AdminSelectOption[];
  assignedAdminUserId: string | null;
  priority: string;
  status: string;
  ticketId: string;
};

const priorityOptions = ["low", "normal", "high", "urgent"] as const;
const statusOptions = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed"
] as const;

export function AdminSupportTicketForm({
  adminOptions,
  assignedAdminUserId,
  priority,
  status,
  ticketId
}: AdminSupportTicketFormProps) {
  const router = useRouter();
  const t = useTranslations("Admin.support.form");
  const [currentPriority, setCurrentPriority] = useState(priority);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentAssignee, setCurrentAssignee] = useState(assignedAdminUserId ?? "");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        body: JSON.stringify({
          assignedAdminUserId: currentAssignee || null,
          priority: currentPriority,
          status: currentStatus
        }),
        headers: {"Content-Type": "application/json"},
        method: "PATCH"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? t("saveErrorDescription"));
      }

      toast.success(t("saveSuccessTitle"), {
        description: t("saveSuccessDescription")
      });
      router.refresh();
    } catch (error) {
      toast.error(t("saveErrorTitle"), {
        description:
          error instanceof Error ? error.message : t("saveErrorDescription")
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={`ticket-status-${ticketId}`}>{t("statusLabel")}</Label>
        <Select
          id={`ticket-status-${ticketId}`}
          onChange={(event) => setCurrentStatus(event.target.value)}
          value={currentStatus}
        >
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {t(`statusOptions.${item}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`ticket-priority-${ticketId}`}>{t("priorityLabel")}</Label>
        <Select
          id={`ticket-priority-${ticketId}`}
          onChange={(event) => setCurrentPriority(event.target.value)}
          value={currentPriority}
        >
          {priorityOptions.map((item) => (
            <option key={item} value={item}>
              {t(`priorityOptions.${item}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`ticket-assignee-${ticketId}`}>{t("assigneeLabel")}</Label>
        <Select
          id={`ticket-assignee-${ticketId}`}
          onChange={(event) => setCurrentAssignee(event.target.value)}
          value={currentAssignee}
        >
          <option value="">{t("unassignedOption")}</option>
          {adminOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end">
        <Button className="w-full lg:w-auto" disabled={isPending} type="submit">
          {isPending ? t("saving") : t("saveAction")}
        </Button>
      </div>
    </form>
  );
}
