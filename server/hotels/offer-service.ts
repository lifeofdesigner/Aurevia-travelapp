import "server-only";

import {type Json} from "@/types/supabase";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type NormalizedHotelOffer} from "@/features/hotels/types";

type CachedHotelOfferRow = {
  expires_at: string;
  id: string;
  offer_payload: Json;
  property_name: string;
  search_hash: string;
  supplier_id: string;
  supplier_offer_id: string;
};

function hydrateOfferIds(
  offer: NormalizedHotelOffer,
  cachedRows: Array<{id: string; supplier_offer_id: string}>
) {
  const offerIdMap = new Map(
    cachedRows.map((row) => [row.supplier_offer_id, row.id] as const)
  );
  const roomOptions = offer.roomOptions.map((roomOption) => ({
    ...roomOption,
    offerId: offerIdMap.get(roomOption.supplierOfferId) ?? roomOption.offerId
  }));

  return {
    ...offer,
    id: offerIdMap.get(offer.roomOptions[0]?.supplierOfferId ?? "") ?? offer.id,
    roomOptions
  };
}

export async function getCachedHotelOffer(offerId: string) {
  const admin = createSupabaseAdminClient();
  const offerResult = await admin
    .from("hotel_offer_cache")
    .select("id, offer_payload, property_name, search_hash, supplier_id, supplier_offer_id, expires_at")
    .eq("id", offerId)
    .maybeSingle();
  const cachedOffer = offerResult.data as CachedHotelOfferRow | null;

  if (!cachedOffer) {
    return null;
  }

  if (new Date(cachedOffer.expires_at).getTime() < Date.now()) {
    return null;
  }

  const siblingResult = await admin
    .from("hotel_offer_cache")
    .select("id, supplier_offer_id")
    .eq("supplier_id", cachedOffer.supplier_id)
    .eq("search_hash", cachedOffer.search_hash)
    .eq("property_name", cachedOffer.property_name);
  const siblings =
    (siblingResult.data as Array<{id: string; supplier_offer_id: string}> | null) ?? [];
  const offer = hydrateOfferIds(
    cachedOffer.offer_payload as unknown as NormalizedHotelOffer,
    siblings
  );

  return {
    offer,
    selectedRoom:
      offer.roomOptions.find(
        (roomOption) => roomOption.supplierOfferId === cachedOffer.supplier_offer_id
      ) ?? offer.roomOptions[0]
  };
}
