"use client";

import {useEffect} from "react";

import {Button} from "@/components/ui/button";

type ConfirmDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pendingLabel?: string;
  title: string;
};

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  description,
  isPending = false,
  onCancel,
  onConfirm,
  pendingLabel,
  title
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/55 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Confirm action
          </p>
          <h2 className="font-display text-[28px] italic text-card-foreground">{title}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? pendingLabel ?? confirmLabel : confirmLabel}
          </Button>
          <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
