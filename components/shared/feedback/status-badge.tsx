import {cn} from "@/lib/utils";

type StatusBadgeProps = {
  className?: string;
  label: string;
  status: string;
};

const SUCCESS_STATUSES = new Set([
  "active",
  "approved",
  "confirmed",
  "delivered",
  "fulfilled",
  "paid",
  "published",
  "read",
  "resolved",
  "sent"
]);

const WARNING_STATUSES = new Set([
  "authorized",
  "in_progress",
  "in_review",
  "issued",
  "open",
  "pending",
  "pending_payment",
  "queued",
  "requires_action",
  "submitted",
  "verifying_identity"
]);

const INFO_STATUSES = new Set([
  "action_required",
  "needs_changes",
  "overdue",
  "partially_confirmed",
  "partially_refunded",
  "waiting_on_customer",
  "withdrawn"
]);

const DANGER_STATUSES = new Set([
  "archived",
  "cancelled",
  "closed",
  "denied",
  "expired",
  "failed",
  "rejected",
  "refunded",
  "void"
]);

function getStatusToneClasses(status: string) {
  const normalizedStatus = status.trim().toLowerCase();

  if (SUCCESS_STATUSES.has(normalizedStatus)) {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  }

  if (WARNING_STATUSES.has(normalizedStatus)) {
    return "border-amber-200/80 bg-amber-50 text-amber-700";
  }

  if (INFO_STATUSES.has(normalizedStatus)) {
    return "border-sky-200/80 bg-sky-50 text-sky-700";
  }

  if (DANGER_STATUSES.has(normalizedStatus)) {
    return "border-rose-200/80 bg-rose-50 text-rose-700";
  }

  return "border-border/80 bg-muted/60 text-muted-foreground";
}

export function StatusBadge({className, label, status}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        getStatusToneClasses(status),
        className
      )}
    >
      {label}
    </span>
  );
}
