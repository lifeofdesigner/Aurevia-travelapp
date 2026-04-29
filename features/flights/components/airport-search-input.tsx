"use client";

import {Loader2} from "lucide-react";
import {useEffect, useId, useMemo, useRef, useState} from "react";

import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";

import {
  FLIGHT_AIRPORT_OPTIONS,
  getFlightAirportByCode,
  getFlightAirportSearchText,
  resolveFlightAirport,
  type FlightAirportOption
} from "../lib/airports-data";

type AirportSuggestion = {
  city: string;
  code: string;
  country: string;
  countryCode?: string;
  name: string;
  type: string;
};

type AirportSearchInputProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

function normalizeAirportSearchQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function mapAirportOptionToSuggestion(airport: FlightAirportOption): AirportSuggestion {
  return {
    city: airport.cityName,
    code: airport.iataCode,
    country: airport.countryName,
    countryCode: airport.countryCode,
    name: airport.airportName,
    type: "airport"
  };
}

function getAirportSuggestionDisplayValue(airport: AirportSuggestion) {
  return `${airport.city} (${airport.code})`;
}

function getAirportSuggestionSearchText(airport: AirportSuggestion) {
  return normalizeAirportSearchQuery(
    [
      airport.city,
      airport.name,
      airport.code,
      airport.country,
      getAirportSuggestionDisplayValue(airport)
    ].join(" ")
  );
}

function getAirportSearchScore(airport: AirportSuggestion, normalizedQuery: string) {
  const code = airport.code.toLowerCase();
  const city = airport.city.toLowerCase();
  const airportName = airport.name.toLowerCase();
  const country = airport.country.toLowerCase();
  const fullText = getAirportSuggestionSearchText(airport);

  if (code === normalizedQuery) {
    return 0;
  }

  if (city === normalizedQuery) {
    return 1;
  }

  if (airportName === normalizedQuery) {
    return 2;
  }

  if (country === normalizedQuery) {
    return 3;
  }

  if (code.startsWith(normalizedQuery)) {
    return 4;
  }

  if (city.startsWith(normalizedQuery)) {
    return 5;
  }

  if (airportName.startsWith(normalizedQuery)) {
    return 6;
  }

  if (country.startsWith(normalizedQuery)) {
    return 7;
  }

  if (fullText.includes(normalizedQuery)) {
    return 8;
  }

  return Number.POSITIVE_INFINITY;
}

function isPopularGlobalAirport(airport: FlightAirportOption) {
  return ["VIE", "LHR", "JFK", "DXB", "CDG", "AMS", "SIN", "HKG"].includes(
    airport.iataCode
  );
}

function dedupeAirportSuggestions(suggestions: AirportSuggestion[]) {
  return Array.from(
    new Map(suggestions.map((suggestion) => [suggestion.code, suggestion] as const)).values()
  );
}

function resolveExactAirportInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parenthesizedCode = trimmedValue.match(/\(([A-Za-z0-9]{3})\)$/)?.[1];
  const directCode = /^[A-Za-z0-9]{3}$/.test(trimmedValue) ? trimmedValue : null;
  const airportByCode = parenthesizedCode
    ? getFlightAirportByCode(parenthesizedCode)
    : directCode
      ? getFlightAirportByCode(directCode)
      : null;

  if (airportByCode) {
    return airportByCode;
  }

  return resolveFlightAirport(trimmedValue);
}

export function AirportSearchInput({
  label,
  onChange,
  placeholder,
  value
}: AirportSearchInputProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [rememberedSuggestions, setRememberedSuggestions] = useState<
    Record<string, AirportSuggestion>
  >({});
  const resolvedAirport = useMemo(() => resolveFlightAirport(value), [value]);
  const selectedSuggestion = useMemo(() => {
    if (resolvedAirport) {
      return mapAirportOptionToSuggestion(resolvedAirport);
    }

    const localAirport = getFlightAirportByCode(value);

    if (localAirport) {
      return mapAirportOptionToSuggestion(localAirport);
    }

    return rememberedSuggestions[value] ?? null;
  }, [rememberedSuggestions, resolvedAirport, value]);
  const [query, setQuery] = useState(() =>
    selectedSuggestion ? getAirportSuggestionDisplayValue(selectedSuggestion) : value
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [remoteSuggestions, setRemoteSuggestions] = useState<AirportSuggestion[]>([]);

  const normalizedQuery = normalizeAirportSearchQuery(query);

  useEffect(() => {
    const nextQuery = selectedSuggestion
      ? getAirportSuggestionDisplayValue(selectedSuggestion)
      : value;

    setQuery((current) => (current === nextQuery ? current : nextQuery));
  }, [selectedSuggestion, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const defaultAirportSuggestions = useMemo(
    () =>
      FLIGHT_AIRPORT_OPTIONS.filter(isPopularGlobalAirport).map(mapAirportOptionToSuggestion),
    []
  );

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setRemoteSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/airports/search?q=${encodeURIComponent(query.trim())}`,
          {
            cache: "no-store",
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load airport suggestions.");
        }

        const payload = (await response.json()) as AirportSuggestion[];

        setRemoteSuggestions(
          payload
            .filter((airport) => airport.code.trim().length > 0)
            .map((airport) => ({
              ...airport,
              countryCode:
                airport.countryCode ??
                getFlightAirportByCode(airport.code)?.countryCode ??
                undefined
            }))
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setRemoteSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, query]);

  const localSuggestions = useMemo(() => {
    if (!normalizedQuery) {
      return defaultAirportSuggestions;
    }

    return FLIGHT_AIRPORT_OPTIONS.filter((airport) =>
      getFlightAirportSearchText(airport).includes(normalizedQuery)
    )
      .map(mapAirportOptionToSuggestion)
      .sort((left, right) => {
        const scoreDifference =
          getAirportSearchScore(left, normalizedQuery) -
          getAirportSearchScore(right, normalizedQuery);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return left.city.localeCompare(right.city) || left.name.localeCompare(right.name);
      });
  }, [defaultAirportSuggestions, normalizedQuery]);

  const visibleAirports = useMemo(
    () => dedupeAirportSuggestions([...localSuggestions, ...remoteSuggestions]),
    [localSuggestions, remoteSuggestions]
  );

  const flattenedAirports = visibleAirports;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (flattenedAirports.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((current) => {
      if (current < 0) {
        return 0;
      }

      return Math.min(current, flattenedAirports.length - 1);
    });
  }, [flattenedAirports.length, isOpen]);

  function selectAirport(airport: AirportSuggestion) {
    setRememberedSuggestions((current) => ({
      ...current,
      [airport.code]: airport
    }));
    setQuery(getAirportSuggestionDisplayValue(airport));
    onChange(airport.code);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function renderGroup(
    title: string,
    airports: AirportSuggestion[],
    indexOffset: number
  ) {
    if (airports.length === 0) {
      return null;
    }

    return (
      <div key={title} className="pb-2 last:pb-0">
        <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>

        <div className="space-y-1">
          {airports.map((airport, airportIndex) => {
            const optionIndex = indexOffset + airportIndex;
            const isHighlighted = highlightedIndex === optionIndex;

            return (
              <button
                key={`${airport.type}-${airport.code}`}
                id={`${inputId}-option-${airport.code}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  isHighlighted
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-transparent text-foreground hover:bg-muted/80"
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectAirport(airport);
                }}
                onMouseEnter={() => setHighlightedIndex(optionIndex)}
              >
                <span className="flex h-11 min-w-[3rem] shrink-0 items-center justify-center rounded-lg bg-background/90 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm">
                  {airport.type === "city" ? "CITY" : airport.code}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">
                    {airport.city}
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {airport.name}
                  </span>
                </span>

                <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  {airport.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>

      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-busy={isLoading}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${inputId}-option-${flattenedAirports[highlightedIndex]?.code}`
              : undefined
          }
          className="h-11 rounded-lg border-border/80 bg-background px-4 pr-11 text-sm text-foreground shadow-sm placeholder:text-muted-foreground"
          onChange={(event) => {
            const nextValue = event.target.value;
            const exactAirport = resolveExactAirportInput(nextValue);

            setQuery(nextValue);

            if (exactAirport) {
              onChange(exactAirport.iataCode);
            } else if (
              !selectedSuggestion ||
              nextValue !== getAirportSuggestionDisplayValue(selectedSuggestion)
            ) {
              onChange("");
            }

            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              setHighlightedIndex(-1);
              return;
            }

            if (flattenedAirports.length === 0) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) =>
                current >= flattenedAirports.length - 1 ? 0 : current + 1
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) =>
                current <= 0 ? flattenedAirports.length - 1 : current - 1
              );
              return;
            }

            if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
              event.preventDefault();
              selectAirport(flattenedAirports[highlightedIndex]);
            }
          }}
        />

        {isLoading ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          </span>
        ) : null}

        {isOpen ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-soft backdrop-blur">
            <div id={listboxId} role="listbox" className="max-h-72 overflow-y-auto p-2">
              {flattenedAirports.length === 0 ? (
                <div className="px-4 py-5 text-sm text-muted-foreground">
                  {isLoading ? "Searching airports..." : "No airports found."}
                </div>
              ) : (
                renderGroup(
                  normalizedQuery ? "Matching airports" : "Popular global airports",
                  flattenedAirports,
                  0
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
