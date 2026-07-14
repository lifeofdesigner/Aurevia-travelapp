"use client";

import {type ReactNode} from "react";

import {GlobalInteractionFeedback} from "@/components/shared/feedback/global-interaction-feedback";
import {QueryProvider} from "@/components/shared/providers/query-provider";
import {ToastProvider} from "@/components/shared/providers/toast-provider";
import {ChatWidget} from "@/components/live-chat/ChatWidget";
import {CurrencyProvider} from "@/lib/currency/use-currency";
import {type DisplayCurrency} from "@/lib/currency/config";

type AppProvidersProps = {
  children: ReactNode;
  initialCurrency?: DisplayCurrency;
};

export function AppProviders({children, initialCurrency}: AppProvidersProps) {
  return (
    <QueryProvider>
      <CurrencyProvider initialCurrency={initialCurrency}>
        <GlobalInteractionFeedback />
        {children}
        <ChatWidget />
        <ToastProvider />
      </CurrencyProvider>
    </QueryProvider>
  );
}
