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
            : "text-[10px] text-muted-foreground"
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
              ? "h-8 rounded-[3px] border border-border/60 bg-background/60 px-3 pr-8 text-[11px] uppercase tracking-[0.08em] text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              : "h-11 rounded-[8px] border border-input bg-background px-4 pr-10 text-[12px] uppercase tracking-[0.08em] text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            isHeaderVariant ? "h-3.5 w-3.5" : "h-4 w-4"
          )}
        />
      </div>
    </div>
  );
}
