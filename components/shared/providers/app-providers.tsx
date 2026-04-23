"use client";

import {type ReactNode} from "react";

import {QueryProvider} from "@/components/shared/providers/query-provider";
import {ToastProvider} from "@/components/shared/providers/toast-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({children}: AppProvidersProps) {
  return (
    <QueryProvider>
      {children}
      <ToastProvider />
    </QueryProvider>
  );
}
