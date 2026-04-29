import {createHash} from "crypto";

import {type Json} from "@/types/supabase";
import {buildCarResultsMetadata} from "@/features/cars/lib/results";
import {type CarSearchCriteria, type CarSearchResponse, type NormalizedCarOffer} from "@/features/cars/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {findMobilityLocationByQuery} from "@/server/providers/mobility/locations";
import {getDefaultCarProvider} from "@/server/providers/cars";
import {MOCK_CARS_SUPPLIER} from "@/server/providers/cars/catalog";

type SearchCarsContext = {
  ipHash?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

type CachedCarOfferRow = {
  id: string;
  supplier_offer_id: string;
};

function buildSearchHash(criteria: CarSearchCriteria) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        driverAge: criteria.driverAge,
        dropoffDate: criteria.dropoffDate,
        dropoffLocation: criteria.dropoffLocation.toLowerCase(),
        dropoffTime: criteria.dropoffTime,
        pickupDate: criteria.pickupDate,
        pickupLocation: criteria.pickupLocation.toLowerCase(),
        pickupTime: criteria.pickupTime,
        preferredCategory: criteria.preferredCategory ?? null
      })
    )
    .digest("hex");
}

function toJson(value: unknown) {
  return value as Json;
}

function mapRowsToCachedOffers(
  offers: NormalizedCarOffer[],
  cachedRows: CachedCarOfferRow[]
) {
  const cacheIdMap = new Map(
    cachedRows.map((row) => [row.supplier_offer_id, row.id] as const)
  );

  return offers.map((offer) => ({
    ...offer,
    id: cacheIdMap.get(offer.supplierOfferId) ?? offer.id
  }));
}

export async function searchCars(
  criteria: CarSearchCriteria,
  context: SearchCarsContext
): Promise<CarSearchResponse> {
  const admin = createSupabaseAdminClient();
  const pickupLocation = findMobilityLocationByQuery(criteria.pickupLocation);
  const dropoffLocation = findMobilityLocationByQuery(criteria.dropoffLocation);

  if (!pickupLocation || !dropoffLocation) {
    const searchLogInsert = await admin
      .from("search_logs")
      .insert({
        booking_type: "car_rental",
        currency_code: criteria.currency,
        departure_date: criteria.pickupDate,
        destination_query: criteria.dropoffLocation,
        filters: toJson({
          driverAge: criteria.driverAge,
          dropoffTime: criteria.dropoffTime,
          preferredCategory: criteria.preferredCategory ?? null,
          pickupTime: criteria.pickupTime
        }),
        locale: criteria.locale,
        metadata: toJson({
          provider: MOCK_CARS_SUPPLIER.code
        }),
        origin_query: criteria.pickupLocation,
        passenger_summary: toJson({
          driverCount: 1,
          driverAge: criteria.driverAge
        }),
        result_count: 0,
        return_date: criteria.dropoffDate,
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
      metadata: buildCarResultsMetadata([]),
      offers: [],
      searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
    };
  }

  const searchHash = buildSearchHash(criteria);
  const provider = getDefaultCarProvider();
  const providerOffers = await provider.search(criteria, {
    dropoffLocation,
    pickupLocation,
    searchHash
  });
  const cacheRows = providerOffers.map((offer) => ({
    bag_count: offer.bagCount,
    currency_code: offer.currency,
    dropoff_airport_code: offer.dropoffAirportCode ?? null,
    dropoff_city_id: offer.dropoffCityId,
    expires_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    offer_payload: toJson(offer),
    pickup_airport_code: offer.pickupAirportCode ?? null,
    pickup_at: offer.pickupAt,
    pickup_city_id: offer.pickupCityId,
    return_at: offer.dropoffAt,
    search_hash: searchHash,
    seat_count: offer.seatCount,
    supplier_id: MOCK_CARS_SUPPLIER.id,
    supplier_offer_id: offer.supplierOfferId,
    total_amount_minor: offer.totalAmount.amountMinor,
    vehicle_category: offer.vehicleCategory,
    vehicle_name: offer.vehicleName
  }));

  let cachedRows: CachedCarOfferRow[] = [];

  if (cacheRows.length > 0) {
    const cacheResult = await admin
      .from("car_offer_cache")
      .upsert(cacheRows, {
        onConflict: "supplier_id,search_hash,supplier_offer_id"
      })
      .select("id, supplier_offer_id");

    cachedRows = (cacheResult.data as CachedCarOfferRow[] | null) ?? [];
  }

  const offers = mapRowsToCachedOffers(providerOffers, cachedRows);
  const searchLogInsert = await admin
    .from("search_logs")
    .insert({
      booking_type: "car_rental",
      currency_code: criteria.currency,
      departure_date: criteria.pickupDate,
      destination_query: criteria.dropoffLocation,
      filters: toJson({
        driverAge: criteria.driverAge,
        dropoffTime: criteria.dropoffTime,
        preferredCategory: criteria.preferredCategory ?? null,
        pickupTime: criteria.pickupTime
      }),
      locale: criteria.locale,
      metadata: toJson({
        dropoffCityId: dropoffLocation.cityId,
        pickupCityId: pickupLocation.cityId,
        provider: provider.code,
        searchHash
      }),
      origin_query: criteria.pickupLocation,
      passenger_summary: toJson({
        driverCount: 1,
        driverAge: criteria.driverAge
      }),
      result_count: offers.length,
      return_date: criteria.dropoffDate,
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
    metadata: buildCarResultsMetadata(offers),
    offers,
    searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
  };
}
