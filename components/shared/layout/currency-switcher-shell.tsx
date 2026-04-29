"use client";

import {ChevronDown} from "lucide-react";
import {useId} from "react";

import {
  DISPLAY_CURRENCY_FLAGS,
  HEADER_DISPLAY_CURRENCIES,
  type DisplayCurrency
} from "@/lib/currency/config";
import {useCurrency} from "@/lib/currency/use-currency";
import {cn} from "@/lib/utils";

type CurrencySwitcherShellProps = {
  label?: string;
  variant?: "header" | "panel";
};

export function CurrencySwitcherShell({
  label = "Currency",
  variant = "header"
}: CurrencySwitcherShellProps) {
  const selectId = useId();
  const {currency, setCurrency} = useCurrency();
  const isHeaderVariant = variant === "header";

  return (
    <div className={cn("space-y-2", isHeaderVariant ? "min-w-[108px]" : "w-full")}>
      <label
        htmlFor={selectId}
        className={cn(
          "font-semibold uppercase tracking-[0.18em]",
          isHeaderVariant
            ? "sr-only"
            : "text-[10px] text-[rgba(232,223,200,0.55)]"
        )}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={currency}
          onChange={(event) =>
            setCurrency(event.target.value as DisplayCurrency)
          }
          className={cn(
            "w-full appearance-none font-semibold transition-colors focus-visible:outline-none",
            isHeaderVariant
              ? "h-8 rounded-[3px] border border-[rgba(232,223,200,0.16)] bg-[rgba(17,29,21,0.25)] px-3 pr-8 text-[11px] uppercase tracking-[0.08em] text-[#e8dfc8] focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3d2e]"
              : "h-11 rounded-[8px] border border-[rgba(232,223,200,0.16)] bg-[rgba(17,29,21,0.35)] px-4 pr-10 text-[12px] uppercase tracking-[0.08em] text-[#f5f0e8] focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3d2e]"
          )}
        >
          {HEADER_DISPLAY_CURRENCIES.map((option) => (
            <option key={option} value={option}>
              {`${DISPLAY_CURRENCY_FLAGS[option]} ${option}`}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#c9a84c]",
            isHeaderVariant ? "h-3.5 w-3.5" : "h-4 w-4"
          )}
        />
      </div>
    </div>
  );
}
