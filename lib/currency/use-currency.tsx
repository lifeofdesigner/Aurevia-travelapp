"use client";

import {createContext, useContext, useEffect, useState, type ReactNode} from "react";

import {
  CURRENCY_COOKIE_NAME,
  FALLBACK_EXCHANGE_RATES,
  normalizeDisplayCurrency,
  resolveSearchCurrency,
  type DisplayCurrency
} from "@/lib/currency/config";
import {DEFAULT_CURRENCY, toMajorUnit, type SupportedCurrency} from "@/lib/money";

type CurrencyRatesPayload = {
  rates?: Partial<Record<DisplayCurrency, number>>;
};

type CurrencyContextValue = {
  convertPrice: (
    amountMinor: number,
    fromCurrency: SupportedCurrency | DisplayCurrency
  ) => number;
  currency: DisplayCurrency;
  formatPrice: (
    amountMinor: number,
    fromCurrency: SupportedCurrency | DisplayCurrency,
    locale?: string,
    options?: Intl.NumberFormatOptions
  ) => string;
  isLoadingRates: boolean;
  searchCurrency: SupportedCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
};

type CurrencyProviderProps = {
  children: ReactNode;
  initialCurrency?: DisplayCurrency;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function getRate(
  rates: Record<DisplayCurrency, number>,
  currency: DisplayCurrency
) {
  return rates[currency] ?? FALLBACK_EXCHANGE_RATES[currency];
}

export function CurrencyProvider({
  children,
  initialCurrency = DEFAULT_CURRENCY
}: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<DisplayCurrency>(
    normalizeDisplayCurrency(initialCurrency)
  );
  const [rates, setRates] =
    useState<Record<DisplayCurrency, number>>(FALLBACK_EXCHANGE_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CURRENCY_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (cookieValue) {
      setCurrency(normalizeDisplayCurrency(decodeURIComponent(cookieValue)));
    }
  }, []);

  useEffect(() => {
    document.cookie = `${CURRENCY_COOKIE_NAME}=${encodeURIComponent(currency)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [currency]);

  useEffect(() => {
    let isActive = true;

    async function loadRates() {
      try {
        const response = await fetch("/api/currency/rates");

        if (!response.ok) {
          throw new Error(`Currency rate request failed with ${response.status}.`);
        }

        const payload = (await response.json()) as CurrencyRatesPayload;

        if (!isActive || !payload.rates) {
          return;
        }

        setRates((currentRates) => ({
          ...currentRates,
          ...payload.rates
        }));
      } catch (error) {
        console.error("Failed to load currency rates in the client.", error);
      } finally {
        if (isActive) {
          setIsLoadingRates(false);
        }
      }
    }

    void loadRates();

    return () => {
      isActive = false;
    };
  }, []);

  function convertPrice(
    amountMinor: number,
    fromCurrency: SupportedCurrency | DisplayCurrency
  ) {
    const amount = toMajorUnit(
      amountMinor,
      fromCurrency as SupportedCurrency
    );

    if (fromCurrency === currency) {
      return amount;
    }

    const fromRate = getRate(rates, fromCurrency as DisplayCurrency);
    const toRate = getRate(rates, currency);
    const amountInEur = fromCurrency === "EUR" ? amount : amount / fromRate;

    return Math.round(amountInEur * toRate * 100) / 100;
  }

  function formatPrice(
    amountMinor: number,
    fromCurrency: SupportedCurrency | DisplayCurrency,
    locale = "en",
    options: Intl.NumberFormatOptions = {}
  ) {
    return new Intl.NumberFormat(locale, {
      currency,
      currencyDisplay: "symbol",
      style: "currency",
      ...options
    }).format(convertPrice(amountMinor, fromCurrency));
  }

  return (
    <CurrencyContext.Provider
      value={{
        convertPrice,
        currency,
        formatPrice,
        isLoadingRates,
        searchCurrency: resolveSearchCurrency(currency),
        setCurrency
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider.");
  }

  return context;
}

type CurrencyAmountProps = {
  amountMinor: number;
  className?: string;
  fromCurrency: SupportedCurrency | DisplayCurrency;
  locale: string;
  options?: Intl.NumberFormatOptions;
};

export function CurrencyAmount({
  amountMinor,
  className,
  fromCurrency,
  locale,
  options
}: CurrencyAmountProps) {
  const {formatPrice} = useCurrency();

  return (
    <span className={className}>
      {formatPrice(amountMinor, fromCurrency, locale, options)}
    </span>
  );
}

