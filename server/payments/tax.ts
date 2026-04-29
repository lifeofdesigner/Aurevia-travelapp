import "server-only";

import {type SupportedCurrency} from "@/lib/money";

import {type PaymentBookingSummary, type BookingTaxLine} from "./types";

export const AUSTRIAN_BASELINE_VAT_RATE = 0.2;
export const AUSTRIAN_BASELINE_VAT_LABEL = "Austrian VAT baseline";

export type PaymentTaxPolicy = {
  accountantReviewRequired: boolean;
  jurisdictionCountryCode: string;
  label: string;
  rate: number;
};

export function getDefaultVatPolicy(): PaymentTaxPolicy {
  return {
    accountantReviewRequired: true,
    jurisdictionCountryCode: "AT",
    label: AUSTRIAN_BASELINE_VAT_LABEL,
    rate: AUSTRIAN_BASELINE_VAT_RATE
  };
}

export function buildBookingTaxLines(
  booking: PaymentBookingSummary
): BookingTaxLine[] {
  const policy = getDefaultVatPolicy();

  return booking.items
    .filter((item) => item.taxAmountMinor > 0)
    .map((item) => ({
      bookingItemId: item.bookingItemId,
      currency: item.currencyCode,
      jurisdictionCountryCode: policy.jurisdictionCountryCode,
      rate: policy.rate,
      taxAmountMinor: item.taxAmountMinor,
      taxName: policy.label,
      taxableAmountMinor: item.subtotalAmountMinor
    }));
}

export function normalizeStripeCurrency(currency: SupportedCurrency) {
  return currency.toLowerCase();
}
