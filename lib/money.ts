export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "AED", "NGN"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "EUR";

export type Money = {
  amountMinor: number;
  currency: SupportedCurrency;
};

const currencyMinorUnitDigits: Record<SupportedCurrency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  AED: 2,
  NGN: 2
};

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
}

export function assertMinorUnitAmount(amountMinor: number) {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("Money values must be stored as integer minor units.");
  }
}

export function toMajorUnit(amountMinor: number, currency: SupportedCurrency) {
  assertMinorUnitAmount(amountMinor);
  return amountMinor / 10 ** currencyMinorUnitDigits[currency];
}

export function toMinorUnit(amountMajor: number, currency: SupportedCurrency) {
  const multiplier = 10 ** currencyMinorUnitDigits[currency];
  return Math.round(amountMajor * multiplier);
}

export function formatMoney(
  money: Money,
  locale: string,
  options: Intl.NumberFormatOptions = {}
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "symbol",
    ...options
  }).format(toMajorUnit(money.amountMinor, money.currency));
}
