import {createHash} from "crypto";

import {type Json} from "@/types/supabase";
import {buildTourResultsMetadata} from "@/features/tours/lib/results";
import {type NormalizedTourOffer, type TourSearchCriteria, type TourSearchResponse} from "@/features/tours/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {findTourDestinationByQuery, MOCK_TOURS_SUPPLIER} from "@/server/providers/tours/catalog";
import {getDefaultTourProvider} from "@/server/providers/tours";

type SearchToursContext = {
  ipHash?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

type CachedTourOfferRow = {
  id: string;
  supplier_offer_id: string;
};

function buildSearchHash(criteria: TourSearchCriteria) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        category: criteria.category ?? null,
        currency: criteria.currency,
        destination: criteria.destination.toLowerCase(),
        duration: criteria.duration ?? null,
        serviceDate: criteria.serviceDate
      })
    )
    .digest("hex");
}

function toJson(value: unknown) {
  return value as Json;
}

function mapRowsToCachedOffers(
  offers: NormalizedTourOffer[],
  cachedRows: CachedTourOfferRow[]
) {
  const cacheIdMap = new Map(
    cachedRows.map((row) => [row.supplier_offer_id, row.id] as const)
  );

  return offers.map((offer) => ({
    ...offer,
    id: cacheIdMap.get(offer.supplierOfferId) ?? offer.id
  }));
}

export async function searchTours(
  criteria: TourSearchCriteria,
  context: SearchToursContext
): Promise<TourSearchResponse> {
  const admin = createSupabaseAdminClient();
  const destination = findTourDestinationByQuery(criteria.destination);

  if (!destination) {
    const searchLogInsert = await admin
      .from("search_logs")
      .insert({
        booking_type: "tour",
        currency_code: criteria.currency,
        departure_date: criteria.serviceDate,
        destination_query: criteria.destination,
        filters: toJson({
          category: criteria.category ?? null,
          duration: criteria.duration ?? null
        }),
        locale: criteria.locale,
        metadata: toJson({
          provider: MOCK_TOURS_SUPPLIER.code
        }),
        passenger_summary: toJson({}),
        result_count: 0,
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
      metadata: buildTourResultsMetadata([]),
      offers: [],
      searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
    };
  }

  const searchHash = buildSearchHash(criteria);
  const provider = getDefaultTourProvider();
  const providerOffers = await provider.search(criteria, {
    destination,
    searchHash
  });
  const cacheRows = providerOffers.map((offer) => ({
    category: offer.category,
    currency_code: criteria.currency,
    destination_id: destination.destinationId,
    duration_minutes: offer.durationMinutes,
    expires_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    offer_payload: toJson(offer),
    search_hash: searchHash,
    service_date: criteria.serviceDate,
    supplier_id: MOCK_TOURS_SUPPLIER.id,
    supplier_offer_id: offer.supplierOfferId,
    title: offer.title,
    total_amount_minor: offer.priceFromTotalAmount.amountMinor
  }));

  let cachedRows: CachedTourOfferRow[] = [];

  if (cacheRows.length > 0) {
    const cacheResult = await admin
      .from("tour_offer_cache")
      .upsert(cacheRows, {
        onConflict: "supplier_id,search_hash,supplier_offer_id"
      })
      .select("id, supplier_offer_id");

    cachedRows = (cacheResult.data as CachedTourOfferRow[] | null) ?? [];
  }

  const offers = mapRowsToCachedOffers(providerOffers, cachedRows);
  const searchLogInsert = await admin
    .from("search_logs")
    .insert({
      booking_type: "tour",
      currency_code: criteria.currency,
      departure_date: criteria.serviceDate,
      destination_query: criteria.destination,
      filters: toJson({
        category: criteria.category ?? null,
        duration: criteria.duration ?? null
      }),
      locale: criteria.locale,
      metadata: toJson({
        destinationId: destination.destinationId,
        destinationSlug: destination.slug,
        provider: provider.code,
        searchHash
      }),
      passenger_summary: toJson({}),
      result_count: offers.length,
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
    metadata: buildTourResultsMetadata(offers),
    offers,
    searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
  };
}
