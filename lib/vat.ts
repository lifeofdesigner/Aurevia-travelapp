import {DEFAULT_CURRENCY, type Money, type SupportedCurrency} from "@/lib/money";

export const AUSTRIA_STANDARD_VAT_RATE = 0.2;

export type VatCalculation = {
  net: Money;
  vat: Money;
  gross: Money;
  rate: number;
};

function money(amountMinor: number, currency: SupportedCurrency): Money {
  return {amountMinor, currency};
}

export function calculateVatFromNet(
  netAmountMinor: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
  rate = AUSTRIA_STANDARD_VAT_RATE
): VatCalculation {
  const vatAmountMinor = Math.round(netAmountMinor * rate);

  return {
    net: money(netAmountMinor, currency),
    vat: money(vatAmountMinor, currency),
    gross: money(netAmountMinor + vatAmountMinor, currency),
    rate
  };
}

export function extractVatFromGross(
  grossAmountMinor: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
  rate = AUSTRIA_STANDARD_VAT_RATE
): VatCalculation {
  const netAmountMinor = Math.round(grossAmountMinor / (1 + rate));
  const vatAmountMinor = grossAmountMinor - netAmountMinor;

  return {
    net: money(netAmountMinor, currency),
    vat: money(vatAmountMinor, currency),
    gross: money(grossAmountMinor, currency),
    rate
  };
}
