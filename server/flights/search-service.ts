import "server-only";

import {createHash} from "crypto";

import {
  type FlightSearchCriteria,
  type FlightSearchResponse
} from "@/features/flights/types";
import {buildFlightResultsMetadata} from "@/features/flights/lib/results";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

import {mapProviderOfferToNormalizedOffer} from "../providers/flights/map-mock-offer";
import {getFlightProviderSearchOrder} from "../providers/flights";
import {resolveMockFlightLocation} from "../providers/flights/catalog";
import {
  type FlightOfferProvider,
  type ProviderFlightOffer,
  type ProviderFlightSearchContext
} from "../providers/flights/types";

type FlightSearchExecutionContext = {
  ipHash?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

function toJson(value: unknown) {
  return value as Json;
}

function createSearchHash(criteria: FlightSearchCriteria) {
  return createHash("sha256")
    .update(JSON.stringify(criteria))
    .digest("hex");
}

function resolveProviderLocation(query: string): ProviderFlightSearchContext["origin"] | null {
  const catalogLocation = resolveMockFlightLocation(query);

  if (catalogLocation) {
    return catalogLocation;
  }

  const airportCode = query.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(airportCode)) {
    return null;
  }

  return {
    airportCode,
    airportName: `${airportCode} Airport`,
    cityName: airportCode,
    countryCode: "ZZ",
    searchAliases: [airportCode.toLowerCase()],
    timeZone: "UTC"
  };
}

function resolveProviderSearchContext(
  provider: FlightOfferProvider,
  criteria: FlightSearchCriteria,
  searchHash: string
) {
  const origin = provider.requiresCatalogLocations
    ? resolveMockFlightLocation(criteria.origin)
    : resolveProviderLocation(criteria.origin);
  const destination = provider.requiresCatalogLocations
    ? resolveMockFlightLocation(criteria.destination)
    : resolveProviderLocation(criteria.destination);

  if (!origin || !destination) {
    return null;
  }

  return {
    destination,
    origin,
    searchHash
  } satisfies ProviderFlightSearchContext;
}

async function searchWithAvailableFlightProvider(
  criteria: FlightSearchCriteria,
  searchHash: string
) {
  const errors: Error[] = [];

  for (const provider of getFlightProviderSearchOrder()) {
    const providerContext = resolveProviderSearchContext(provider, criteria, searchHash);

    if (!providerContext) {
      errors.push(
        new Error(
          provider.requiresCatalogLocations
            ? "We could not match your route to the current mock flight network."
            : "We could not resolve the airport codes for this search."
        )
      );
      continue;
    }

    try {
      const rawOffers = await provider.search(criteria, providerContext);

      return {
        provider,
        providerContext,
        rawOffers
      } satisfies {
        provider: FlightOfferProvider;
        providerContext: ProviderFlightSearchContext;
        rawOffers: ProviderFlightOffer[];
      };
    } catch (error) {
      errors.push(
        error instanceof Error ? error : new Error("Unable to search flights right now.")
      );
    }
  }

  throw errors[errors.length - 1] ?? new Error("Unable to search flights right now.");
}

export async function searchFlights(
  criteria: FlightSearchCriteria,
  context: FlightSearchExecutionContext
): Promise<FlightSearchResponse> {
  const admin = createSupabaseAdminClient();
  const searchHash = createSearchHash(criteria);
  const {provider, rawOffers} = await searchWithAvailableFlightProvider(
    criteria,
    searchHash
  );
  const offers = rawOffers.map((offer) =>
    mapProviderOfferToNormalizedOffer(provider.code, offer)
  );
  const metadata = buildFlightResultsMetadata(offers);

  const searchLogInsert = await admin
    .from("search_logs")
    .insert({
      booking_type: "flight",
      currency_code: criteria.currency,
      departure_date: criteria.departureDate,
      destination_query: criteria.destination,
      filters: toJson({
        cabinClass: criteria.cabinClass,
        multiCitySegments: criteria.multiCitySegments ?? null,
        tripType: criteria.tripType
      }),
      ip_hash: context.ipHash ?? null,
      locale: criteria.locale,
      origin_query: criteria.origin,
      passenger_summary: toJson({
        adults: criteria.adults,
        children: criteria.children,
        infants: criteria.infants
      }),
      result_count: offers.length,
      return_date: criteria.returnDate ?? null,
      session_id: context.sessionId,
      user_agent: context.userAgent ?? null,
      user_id: context.userId ?? null
    })
    .select("id")
    .single();

  if (searchLogInsert.error || !searchLogInsert.data?.id) {
    throw new Error(searchLogInsert.error?.message ?? "Unable to create a flight search log.");
  }

  const searchLogId = (searchLogInsert.data as {id: string}).id;

  const cacheUpsert = await admin
    .from("flight_offer_cache")
    .upsert(
      offers.map((offer) => ({
        cabin_class: offer.cabinClass,
        currency_code: offer.totalAmount.currency,
        departure_date: offer.departureDate,
        destination_airport_code: offer.destinationAirportCode,
        expires_at: offer.expiresAt,
        offer_payload: toJson({
          normalizedOffer: offer,
          providerCode: provider.code,
          searchCriteria: criteria
        }),
        origin_airport_code: offer.originAirportCode,
        passenger_summary: toJson(offer.passengerCounts),
        return_date: offer.returnDate ?? null,
        search_hash: searchHash,
        supplier_id: "12121212-1212-1212-1212-121212121212",
        supplier_offer_id: offer.supplierOfferId,
        total_amount_minor: offer.totalAmount.amountMinor,
        trip_type: offer.tripType
      })),
      {
        onConflict: "supplier_id,search_hash,supplier_offer_id"
      }
    )
    .select("id,supplier_offer_id");

  if (cacheUpsert.error) {
    throw new Error(cacheUpsert.error.message);
  }

  const cacheIdBySupplierOfferId = new Map<string, string>(
    ((cacheUpsert.data ?? []) as Array<{id: string; supplier_offer_id: string}>).map(
      (row) => [row.supplier_offer_id, row.id]
    )
  );

  return {
    criteria,
    executedAt: new Date().toISOString(),
    metadata,
    offers: offers.map((offer) => ({
      ...offer,
      id: cacheIdBySupplierOfferId.get(offer.supplierOfferId) ?? offer.id
    })),
    searchLogId
  };
}
