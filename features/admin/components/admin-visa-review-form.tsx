"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {VISA_APPLICATION_STATUSES} from "@/types/database-enums";

type AdminVisaReviewFormProps = {
  applicationId: string;
  currentStatus: string;
  showQuickActions?: boolean;
};

export function AdminVisaReviewForm({
  applicationId,
  currentStatus,
  showQuickActions = false
}: AdminVisaReviewFormProps) {
  const router = useRouter();
  const t = useTranslations("Admin.visaReview.form");
  const [status, setStatus] = useState(currentStatus);
  const [isPending, setIsPending] = useState(false);

  async function submitStatus(nextStatus: string) {
    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/visa-applications/${applicationId}`, {
        body: JSON.stringify({status: nextStatus}),
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
      setStatus(nextStatus);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitStatus(status);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-[16rem] space-y-2">
          <Label htmlFor={`visa-status-${applicationId}`}>{t("statusLabel")}</Label>
          <Select
            id={`visa-status-${applicationId}`}
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {VISA_APPLICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {t(`statusOptions.${item}`)}
              </option>
            ))}
          </Select>
        </div>
        <Button disabled={isPending} type="submit">
          {isPending ? t("saving") : t("saveAction")}
        </Button>
      </div>

      {showQuickActions ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("emailHelper")}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
              disabled={isPending}
              onClick={() => void submitStatus("approved")}
              type="button"
            >
              {t("approveAction")}
            </Button>
            <Button
              className="bg-[#d32222] text-white hover:bg-[#b71d1d]"
              disabled={isPending}
              onClick={() => void submitStatus("rejected")}
              type="button"
            >
              {t("rejectAction")}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => void submitStatus("needs_changes")}
              type="button"
              variant="outline"
            >
              {t("requestMoreInfoAction")}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
