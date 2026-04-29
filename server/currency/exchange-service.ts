import "server-only";

import {FALLBACK_EXCHANGE_RATES, type DisplayCurrency, DISPLAY_CURRENCIES} from "@/lib/currency/config";
import {DEFAULT_CURRENCY, isSupportedCurrency, toMajorUnit, type SupportedCurrency} from "@/lib/money";

type BaseCurrency = "EUR";

type ExchangeRatesCache = {
  fetchedAt: number;
  rates: Record<DisplayCurrency, number>;
};

const CACHE_TTL_MS = 60 * 60 * 1000;

let exchangeRatesCache: ExchangeRatesCache | null = null;

function normalizeApiKey(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized || normalized.includes("[your key]")) {
    return undefined;
  }

  return normalized;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function getCurrencyRate(
  rates: Record<DisplayCurrency, number>,
  currency: DisplayCurrency
) {
  return rates[currency] ?? FALLBACK_EXCHANGE_RATES[currency];
}

export async function fetchRates(baseCurrency: BaseCurrency = "EUR") {
  const now = Date.now();

  if (exchangeRatesCache && now - exchangeRatesCache.fetchedAt < CACHE_TTL_MS) {
    return exchangeRatesCache.rates;
  }

  const apiKey = normalizeApiKey(process.env.EXCHANGE_RATE_API_KEY);

  if (!apiKey) {
    exchangeRatesCache = {
      fetchedAt: now,
      rates: FALLBACK_EXCHANGE_RATES
    };

    return exchangeRatesCache.rates;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`,
      {
        next: {
          revalidate: 3600
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}.`);
    }

    const payload = (await response.json()) as {
      conversion_rates?: Partial<Record<DisplayCurrency, number>>;
      result?: string;
    };

    if (payload.result !== "success" || !payload.conversion_rates) {
      throw new Error("Exchange rate API returned an invalid payload.");
    }

    const rates = DISPLAY_CURRENCIES.reduce<Record<DisplayCurrency, number>>(
      (result, currency) => {
        const nextRate = payload.conversion_rates?.[currency];
        result[currency] =
          typeof nextRate === "number" && Number.isFinite(nextRate)
            ? nextRate
            : FALLBACK_EXCHANGE_RATES[currency];
        return result;
      },
      {...FALLBACK_EXCHANGE_RATES}
    );

    exchangeRatesCache = {
      fetchedAt: now,
      rates
    };

    return rates;
  } catch (error) {
    console.error("Failed to fetch live exchange rates.", error);

    exchangeRatesCache = {
      fetchedAt: now,
      rates: FALLBACK_EXCHANGE_RATES
    };

    return exchangeRatesCache.rates;
  }
}

export async function convertAmount(
  amount: number,
  from: SupportedCurrency | DisplayCurrency,
  to: DisplayCurrency
) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const rates = await fetchRates("EUR");

  if (from === to) {
    return roundToTwoDecimals(amount);
  }

  const fromRate = getCurrencyRate(rates, from);
  const toRate = getCurrencyRate(rates, to);
  const amountInEur = from === "EUR" ? amount : amount / fromRate;

  return roundToTwoDecimals(amountInEur * toRate);
}

export async function formatPrice(
  amount: number,
  currency: DisplayCurrency,
  locale = "en"
) {
  return new Intl.NumberFormat(locale, {
    currency,
    currencyDisplay: "symbol",
    style: "currency"
  }).format(roundToTwoDecimals(amount));
}

export async function convertMinorAmount(
  amountMinor: number,
  from: SupportedCurrency,
  to: DisplayCurrency
) {
  return convertAmount(toMajorUnit(amountMinor, from), from, to);
}

export function resolveSupportedCurrency(
  currency: string | null | undefined
): SupportedCurrency {
  return currency && isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
}

