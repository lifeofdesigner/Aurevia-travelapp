"use client";

import {useMutation} from "@tanstack/react-query";
import {useCallback, useState} from "react";

import {type FlightOffer, type FlightSearchParams, type FlightSearchResponse} from "./flight-types";

type FlightSearchApiErrorPayload = {
  errors?: Array<{
    field: string;
    message: string;
  }>;
  message?: string;
};

export class FlightSearchServiceError extends Error {
  details?: FlightSearchApiErrorPayload["errors"];
  status: number;

  constructor(
    message: string,
    status: number,
    details?: FlightSearchApiErrorPayload["errors"]
  ) {
    super(message);
    this.name = "FlightSearchServiceError";
    this.status = status;
    this.details = details;
  }
}

export type UseFlightSearchResult = {
  clearResults: () => void;
  error: string | null;
  loading: boolean;
  results: FlightOffer[] | null;
  search: (params: FlightSearchParams) => Promise<FlightSearchResponse>;
  searchId: string | null;
};

export async function searchFlights(
  params: FlightSearchParams
): Promise<FlightSearchResponse> {
  try {
    const response = await fetch("/api/flights/search", {
      body: JSON.stringify(params),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const payload = (await response.json().catch(() => null)) as
      | FlightSearchApiErrorPayload
      | FlightSearchResponse
      | null;

    if (!response.ok) {
      throw new FlightSearchServiceError(
        payload && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Unable to search flights right now.",
        response.status,
        payload && "errors" in payload ? payload.errors : undefined
      );
    }

    if (
      !payload ||
      !("offers" in payload) ||
      !Array.isArray(payload.offers) ||
      typeof payload.searchId !== "string"
    ) {
      throw new FlightSearchServiceError(
        "The flight search response was not in the expected format.",
        500
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof FlightSearchServiceError) {
      throw error;
    }

    throw new FlightSearchServiceError(
      error instanceof Error ? error.message : "Unable to search flights right now.",
      0
    );
  }
}

export function useFlightSearch(): UseFlightSearchResult {
  const [results, setResults] = useState<FlightOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: searchFlights,
    onError: (mutationError) => {
      setResults(null);
      setSearchId(null);
      setError(
        mutationError instanceof FlightSearchServiceError
          ? mutationError.message
          : mutationError instanceof Error
            ? mutationError.message
            : "Unable to search flights right now."
      );
    },
    onSuccess: (response) => {
      setResults(response.offers);
      setSearchId(response.searchId);
      setError(null);
    }
  });

  const search = useCallback(
    async (params: FlightSearchParams) => {
      setError(null);
      setResults(null);
      setSearchId(null);

      return mutation.mutateAsync(params);
    },
    [mutation]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setSearchId(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    clearResults,
    error,
    loading: mutation.isPending,
    results,
    search,
    searchId
  };
}

