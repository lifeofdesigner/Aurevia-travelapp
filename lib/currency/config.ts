import {DEFAULT_CURRENCY, isSupportedCurrency, type SupportedCurrency} from "@/lib/money";

export const DISPLAY_CURRENCIES = [
  "EUR",
  "NGN",
  "GBP",
  "USD",
  "AED",
  "GHS",
  "ZAR"
] as const;

export const HEADER_DISPLAY_CURRENCIES = [
  "EUR",
  "NGN",
  "GBP",
  "USD",
  "AED",
  "GHS"
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_COOKIE_NAME = "aurevia_currency";

export const DISPLAY_CURRENCY_FLAGS: Record<DisplayCurrency, string> = {
  AED: "\uD83C\uDDE6\uD83C\uDDEA",
  EUR: "\uD83C\uDDEA\uD83C\uDDFA",
  GBP: "\uD83C\uDDEC\uD83C\uDDE7",
  GHS: "\uD83C\uDDEC\uD83C\uDDED",
  NGN: "\uD83C\uDDF3\uD83C\uDDEC",
  USD: "\uD83C\uDDFA\uD83C\uDDF8",
  ZAR: "\uD83C\uDDFF\uD83C\uDDE6"
};

export const FALLBACK_EXCHANGE_RATES: Record<DisplayCurrency, number> = {
  AED: 4.18,
  EUR: 1,
  GBP: 0.86,
  GHS: 15.95,
  NGN: 1740,
  USD: 1.13,
  ZAR: 21.25
};

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency);
}

export function normalizeDisplayCurrency(value: string | null | undefined) {
  return value && isDisplayCurrency(value) ? value : DEFAULT_CURRENCY;
}

export function resolveSearchCurrency(currency: DisplayCurrency): SupportedCurrency {
  return isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
}

