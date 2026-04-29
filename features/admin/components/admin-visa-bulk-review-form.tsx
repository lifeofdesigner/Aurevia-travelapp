"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {VISA_APPLICATION_STATUSES} from "@/types/database-enums";

type AdminVisaBulkReviewFormProps = {
  applicationIds: string[];
};

export function AdminVisaBulkReviewForm({
  applicationIds
}: AdminVisaBulkReviewFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState("in_review");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (applicationIds.length === 0) {
      toast.error("No applications selected", {
        description: "Select at least one application before running a bulk update."
      });
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/admin/visa-applications/bulk", {
        body: JSON.stringify({
          applicationIds,
          status
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update the selected applications.");
      }

      toast.success("Bulk status update applied", {
        description: `${applicationIds.length} application${applicationIds.length === 1 ? "" : "s"} updated.`
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update applications", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
      <div className="min-w-[16rem] space-y-2">
        <Label htmlFor="admin-visa-bulk-status">Bulk status</Label>
        <Select
          id="admin-visa-bulk-status"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          {VISA_APPLICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <Button
        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Updating..." : "Apply to selected"}
      </Button>
    </form>
  );
}
