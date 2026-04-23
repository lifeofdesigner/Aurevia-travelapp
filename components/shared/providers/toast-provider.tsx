"use client";

import {Toaster} from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "border-border bg-card text-card-foreground shadow-soft focus-visible:ring-ring"
        }
      }}
    />
  );
}
