import {createHash} from "crypto";

import {type Json} from "@/types/supabase";
import {buildHotelResultsMetadata} from "@/features/hotels/lib/results";
import {type HotelSearchCriteria, type HotelSearchResponse, type NormalizedHotelOffer} from "@/features/hotels/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {findHotelDestinationByQuery, MOCK_HOTELS_SUPPLIER} from "@/server/providers/hotels/catalog";
import {getDefaultHotelProvider} from "@/server/providers/hotels";

type SearchHotelsContext = {
  ipHash?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

type CachedHotelOfferRow = {
  id: string;
  supplier_offer_id: string;
};

function buildSearchHash(criteria: HotelSearchCriteria) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        checkIn: criteria.checkIn,
        checkOut: criteria.checkOut,
        currency: criteria.currency,
        destination: criteria.destination.toLowerCase(),
        guests: criteria.guests,
        preferredStarRating: criteria.preferredStarRating ?? null,
        propertyType: criteria.propertyType ?? null,
        rooms: criteria.rooms
      })
    )
    .digest("hex");
}

function toOfferPayload(offer: NormalizedHotelOffer): Json {
  return offer as unknown as Json;
}

function mapRowsToCachedOffers(
  offers: NormalizedHotelOffer[],
  cachedRows: CachedHotelOfferRow[]
) {
  const cacheIdMap = new Map(
    cachedRows.map((row) => [row.supplier_offer_id, row.id] as const)
  );

  return offers.map((offer) => {
    const roomOptions = offer.roomOptions.map((roomOption) => ({
      ...roomOption,
      offerId: cacheIdMap.get(roomOption.supplierOfferId) ?? roomOption.offerId
    }));

    return {
      ...offer,
      id: roomOptions[0]?.offerId ?? offer.id,
      roomOptions
    };
  });
}

export async function searchHotels(
  criteria: HotelSearchCriteria,
  context: SearchHotelsContext
): Promise<HotelSearchResponse> {
  const admin = createSupabaseAdminClient();
  const destination = findHotelDestinationByQuery(criteria.destination);

  if (!destination) {
    const searchLogInsert = await admin
      .from("search_logs")
      .insert({
        booking_type: "hotel",
        currency_code: criteria.currency,
        destination_query: criteria.destination,
        filters: {
          preferredStarRating: criteria.preferredStarRating ?? null,
          propertyType: criteria.propertyType ?? null,
          rooms: criteria.rooms
        } as unknown as Json,
        locale: criteria.locale,
        metadata: {
          source: MOCK_HOTELS_SUPPLIER.code
        } as unknown as Json,
        passenger_summary: {
          guests: criteria.guests,
          rooms: criteria.rooms
        } as unknown as Json,
        result_count: 0,
        return_date: criteria.checkOut,
        session_id: context.sessionId,
        user_agent: context.userAgent,
        user_id: context.userId ?? null,
        ip_hash: context.ipHash,
        departure_date: criteria.checkIn
      })
      .select("id")
      .maybeSingle();

    return {
      criteria,
      executedAt: new Date().toISOString(),
      metadata: buildHotelResultsMetadata([]),
      offers: [],
      searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
    };
  }

  const searchHash = buildSearchHash(criteria);
  const provider = getDefaultHotelProvider();
  const providerOffers = await provider.search(criteria, {
    destination,
    searchHash
  });

  const cacheRows = providerOffers.flatMap((offer) =>
    offer.roomOptions.map((roomOption) => ({
      check_in_date: criteria.checkIn,
      check_out_date: criteria.checkOut,
      city_id: destination.cityId,
      currency_code: criteria.currency,
      expires_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
      guest_count: criteria.guests,
      offer_payload: toOfferPayload(offer),
      property_name: offer.propertyName,
      rate_type: roomOption.rateType,
      room_count: criteria.rooms,
      room_name: roomOption.roomName,
      search_hash: searchHash,
      supplier_id: MOCK_HOTELS_SUPPLIER.id,
      supplier_offer_id: roomOption.supplierOfferId,
      total_amount_minor: roomOption.totalAmount.amountMinor
    }))
  );

  let cachedRows: CachedHotelOfferRow[] = [];

  if (cacheRows.length > 0) {
    const cacheResult = await admin
      .from("hotel_offer_cache")
      .upsert(cacheRows, {
        onConflict: "supplier_id,search_hash,supplier_offer_id"
      })
      .select("id, supplier_offer_id");

    cachedRows = (cacheResult.data as CachedHotelOfferRow[] | null) ?? [];
  }

  const offers = mapRowsToCachedOffers(providerOffers, cachedRows);
  const searchLogInsert = await admin
    .from("search_logs")
    .insert({
      booking_type: "hotel",
      currency_code: criteria.currency,
      departure_date: criteria.checkIn,
      destination_query: criteria.destination,
      filters: {
        preferredStarRating: criteria.preferredStarRating ?? null,
        propertyType: criteria.propertyType ?? null,
        rooms: criteria.rooms
      } as unknown as Json,
      locale: criteria.locale,
      metadata: {
        destinationCityId: destination.cityId,
        destinationSlug: destination.slug,
        provider: provider.code,
        searchHash
      } as unknown as Json,
      passenger_summary: {
        guests: criteria.guests,
        rooms: criteria.rooms
      } as unknown as Json,
      result_count: offers.length,
      return_date: criteria.checkOut,
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
    metadata: buildHotelResultsMetadata(offers),
    offers,
    searchLogId: (searchLogInsert.data as {id: string} | null)?.id ?? crypto.randomUUID()
  };
}
