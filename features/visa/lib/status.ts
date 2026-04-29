import {type VisaApplicationStatus} from "@/types/database-enums";

export const EDITABLE_VISA_APPLICATION_STATUSES = [
  "draft",
  "needs_changes",
  "action_required"
] as const satisfies VisaApplicationStatus[];

export function isVisaApplicationEditable(status: VisaApplicationStatus) {
  return (EDITABLE_VISA_APPLICATION_STATUSES as readonly VisaApplicationStatus[]).includes(
    status
  );
}

export function getVisaDisplayStatus(status: VisaApplicationStatus): VisaApplicationStatus {
  if (status === "action_required") {
    return "needs_changes";
  }

  return status;
}
