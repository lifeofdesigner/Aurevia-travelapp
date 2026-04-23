"use client";

import {create} from "zustand";
import {persist} from "zustand/middleware";

import {
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  type SupportedCurrency
} from "@/lib/money";

type PreferencesState = {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({currency})
    }),
    {
      name: "aurevia-preferences",
      partialize: (state) => ({currency: state.currency}),
      merge: (persistedState, currentState) => {
        if (
          persistedState &&
          typeof persistedState === "object" &&
          "currency" in persistedState &&
          typeof persistedState.currency === "string" &&
          isSupportedCurrency(persistedState.currency)
        ) {
          return {...currentState, currency: persistedState.currency};
        }

        return currentState;
      }
    }
  )
);
