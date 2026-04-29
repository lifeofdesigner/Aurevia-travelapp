"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {type AdminSelectOption} from "@/features/admin/types";
import {DATA_REQUEST_STATUSES} from "@/types/database-enums";

type AdminDataRequestReviewFormProps = {
  adminOptions: AdminSelectOption[];
  assignedAdminUserId: string | null;
  rejectedReason: string | null;
  requestId: string;
  responseSummary: string | null;
  status: string;
};

export function AdminDataRequestReviewForm({
  adminOptions,
  assignedAdminUserId,
  rejectedReason,
  requestId,
  responseSummary,
  status
}: AdminDataRequestReviewFormProps) {
  const router = useRouter();
  const t = useTranslations("Admin.privacy.form");
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentAssignedAdminUserId, setCurrentAssignedAdminUserId] = useState(
    assignedAdminUserId ?? ""
  );
  const [currentResponseSummary, setCurrentResponseSummary] = useState(
    responseSummary ?? ""
  );
  const [currentRejectedReason, setCurrentRejectedReason] = useState(
    rejectedReason ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/data-requests/${requestId}`, {
        body: JSON.stringify({
          assignedAdminUserId: currentAssignedAdminUserId || null,
          rejectedReason: currentRejectedReason || null,
          responseSummary: currentResponseSummary || null,
          status: currentStatus
        }),
        headers: {"content-type": "application/json"},
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
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={`data-request-status-${requestId}`}>{t("statusLabel")}</Label>
          <Select
            id={`data-request-status-${requestId}`}
            onChange={(event) => setCurrentStatus(event.target.value)}
            value={currentStatus}
          >
            {DATA_REQUEST_STATUSES.map((item) => (
              <option key={item} value={item}>
                {t(`statusOptions.${item}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`data-request-assignee-${requestId}`}>{t("assigneeLabel")}</Label>
          <Select
            id={`data-request-assignee-${requestId}`}
            onChange={(event) => setCurrentAssignedAdminUserId(event.target.value)}
            value={currentAssignedAdminUserId}
          >
            <option value="">{t("unassignedOption")}</option>
            {adminOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`data-request-response-${requestId}`}>{t("responseSummaryLabel")}</Label>
          <Textarea
            id={`data-request-response-${requestId}`}
            onChange={(event) => setCurrentResponseSummary(event.target.value)}
            rows={3}
            value={currentResponseSummary}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`data-request-rejection-${requestId}`}>{t("rejectedReasonLabel")}</Label>
          <Textarea
            id={`data-request-rejection-${requestId}`}
            onChange={(event) => setCurrentRejectedReason(event.target.value)}
            rows={3}
            value={currentRejectedReason}
          />
        </div>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? t("saving") : t("saveAction")}
      </Button>
    </form>
  );
}
