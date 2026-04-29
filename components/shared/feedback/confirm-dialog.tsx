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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#111d15]/55 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-[#e8e0d0] bg-white p-6 shadow-[0_30px_80px_rgba(17,29,21,0.24)]">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a9a85]">
            Confirm action
          </p>
          <h2 className="font-display text-[28px] italic text-[#1c3d2e]">{title}</h2>
          <p className="text-sm leading-7 text-[#56705f]">{description}</p>
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
