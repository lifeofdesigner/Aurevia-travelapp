import {createHash} from "crypto";

import {type Json} from "@/types/supabase";
import {buildTransferResultsMetadata} from "@/features/transfers/lib/results";
import {type NormalizedTransferOffer, type TransferSearchCriteria, type TransferSearchResponse} from "@/features/transfers/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {getDefaultTransferProvider} from "@/server/providers/transfers";
import {MOCK_TRANSFERS_SUPPLIER} from "@/server/providers/transfers/catalog";
import {findMobilityLocationByAirportCode, findMobilityLocationByQuery} from "@/server/providers/mobility/locations";

type SearchTransfersContext = {
  ipHash?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

type CachedTransferOfferRow = {
  id: string;
  supplier_offer_id: string;
};

function buildSearchHash(criteria: TransferSearchCriteria) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        airportCode: criteria.airportCode ?? null,
        dropoffLocation: criteria.dropoffLocation.toLowerCase(),
        flightNumber: criteria.flightNumber ?? null,
        luggageCount: criteria.luggageCount,
        meetAndGreet: criteria.meetAndGreet,
        passengerCount: criteria.passengerCount,
        pickupDate: criteria.pickupDate,
        pickupLocation: criteria.pickupLocation.toLowerCase(),
        pickupTime: criteria.pickupTime,
        routeMode: criteria.routeMode,
        vehicleClass: criteria.vehicleClass ?? null
      })
    )
    .digest("hex");
}

function toJson(value: unknown) {
  return value as Json;
}

function mapRowsToCachedOffers(
  offers: NormalizedTransferOffer[],
  cachedRows: CachedTransferOfferRow[]
) {
  const cacheIdMap = new Map(
    cachedRows.map((row) => [row.supplier_offer_id, row.id] as const)
  );

  return offers.map((offer) => ({
    ...offer,
    id: cacheIdMap.get(offer.supplierOfferId) ?? offer.id
  }));
}

export async function searchTransfers(
  criteria: TransferSearchCriteria,
  context: SearchTransfersContext
): Promise<TransferSearchResponse> {
  const admin = createSupabaseAdminClient();
  const pickupLocation = findMobilityLocationByQuery(criteria.pickupLocation);
  const dropoffLocation = findMobilityLocationByQuery(criteria.dropoffLocation);
  const airportLocation = criteria.airportCode
    ? findMobilityLocationByAirportCode(criteria.airportCode)
    : undefined;

  if (!pickupLocation || !dropoffLocation) {
    const searchLogInsert = await admin
      .from("search_logs")
      .insert({
        booking_type: "airport_transfer",
        currency_code: criteria.currency,
        departure_date: criteria.pickupDate,
        destination_query: criteria.dropoffLocation,
        filters: toJson({
          airportCode: criteria.airportCode ?? null,
          flightNumber: criteria.flightNumber ?? null,
          luggageCount: criteria.luggageCount,
          meetAndGreet: criteria.meetAndGreet,
          pickupTime: criteria.pickupTime,
          routeMode: criteria.routeMode,
          vehicleClass: criteria.vehicleClass ?? null
        }),
        locale: criteria.locale,
        metadata: toJson({
          provider: MOCK_TRANSFERS_SUPPLIER.code
        }),
        origin_query: criteria.pickupLocation,
        passenger_summary: toJson({
          luggageCount: criteria.luggageCount,
          passengerCount: criteria.passengerCount
        }),
        result_count: 0,
        return_date: null,
        session_id: context.sessionId,
        user_agent: context.userAgent,
        user_id: context.userId ?? null,
        ip_hash: context.ipHash
      })
      .select("id")
      .maybeSingle();

    return {
      criteria,
      executedAt: new Date().toISOString(),
      metadata: buildTransferResultsMetadata([]),
      offers: [],
      searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
    };
  }

  const searchHash = buildSearchHash(criteria);
  const provider = getDefaultTransferProvider();
  const providerOffers = await provider.search(criteria, {
    airportLocation,
    dropoffLocation,
    pickupLocation,
    searchHash
  });
  const cacheRows = providerOffers.map((offer) => ({
    currency_code: criteria.currency,
    dropoff_city_id: offer.dropoffCityId,
    expires_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    luggage_count: offer.luggageCount,
    offer_payload: toJson(offer),
    passenger_count: offer.passengerCount,
    pickup_at: offer.pickupAt,
    pickup_city_id: offer.pickupCityId,
    search_hash: searchHash,
    supplier_id: MOCK_TRANSFERS_SUPPLIER.id,
    supplier_offer_id: offer.supplierOfferId,
    total_amount_minor: offer.totalAmount.amountMinor,
    transfer_type: offer.vehicleClass,
    vehicle_name: offer.vehicleName
  }));

  let cachedRows: CachedTransferOfferRow[] = [];

  if (cacheRows.length > 0) {
    const cacheResult = await admin
      .from("transfer_offer_cache")
      .upsert(cacheRows, {
        onConflict: "supplier_id,search_hash,supplier_offer_id"
      })
      .select("id, supplier_offer_id");

    cachedRows = (cacheResult.data as CachedTransferOfferRow[] | null) ?? [];
  }

  const offers = mapRowsToCachedOffers(providerOffers, cachedRows);
  const searchLogInsert = await admin
    .from("search_logs")
    .insert({
      booking_type: "airport_transfer",
      currency_code: criteria.currency,
      departure_date: criteria.pickupDate,
      destination_query: criteria.dropoffLocation,
      filters: toJson({
        airportCode: criteria.airportCode ?? null,
        flightNumber: criteria.flightNumber ?? null,
        luggageCount: criteria.luggageCount,
        meetAndGreet: criteria.meetAndGreet,
        pickupTime: criteria.pickupTime,
        routeMode: criteria.routeMode,
        vehicleClass: criteria.vehicleClass ?? null
      }),
      locale: criteria.locale,
      metadata: toJson({
        airportCode: criteria.airportCode ?? null,
        dropoffCityId: dropoffLocation.cityId,
        pickupCityId: pickupLocation.cityId,
        provider: provider.code,
        searchHash
      }),
      origin_query: criteria.pickupLocation,
      passenger_summary: toJson({
        luggageCount: criteria.luggageCount,
        passengerCount: criteria.passengerCount
      }),
      result_count: offers.length,
      return_date: null,
      session_id: context.sessionId,
      user_agent: context.userAgent,
      user_id: context.userId ?? null,
      ip_hash: context.ipHash
    })
    .select("id")
    .maybeSingle();

  return {
    criteria,
    executedAt: new Date().toISOString(),
    metadata: buildTransferResultsMetadata(offers),
    offers,
    searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
  };
}
