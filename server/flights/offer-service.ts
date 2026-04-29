import "server-only";

import {type FlightSearchCriteria, type NormalizedFlightOffer} from "@/features/flights/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

type CachedFlightOfferPayload = {
  normalizedOffer: NormalizedFlightOffer;
  searchCriteria?: FlightSearchCriteria;
};

export type CachedFlightOfferRecord = {
  offer: NormalizedFlightOffer;
  searchCriteria?: FlightSearchCriteria;
  supplierId: string;
};

function parseCachedFlightOfferPayload(
  payload: unknown,
  cacheId: string
): CachedFlightOfferPayload {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("normalizedOffer" in payload) ||
    !payload.normalizedOffer
  ) {
    throw new Error("Flight offer cache payload is missing a normalized offer.");
  }

  const typedPayload = payload as CachedFlightOfferPayload;

  return {
    normalizedOffer: {
      ...typedPayload.normalizedOffer,
      id: cacheId
    },
    searchCriteria: typedPayload.searchCriteria
  };
}

export async function getCachedFlightOffer(
  offerId: string
): Promise<CachedFlightOfferRecord | null> {
  const admin = createSupabaseAdminClient();
  const response = await admin
    .from("flight_offer_cache")
    .select("id, offer_payload, supplier_id")
    .eq("id", offerId)
    .single();

  if (response.error || !response.data) {
    return null;
  }

  const row = response.data as {
    id: string;
    offer_payload: unknown;
    supplier_id: string;
  };
  const payload = parseCachedFlightOfferPayload(row.offer_payload, row.id);

  return {
    offer: payload.normalizedOffer,
    searchCriteria: payload.searchCriteria,
    supplierId: row.supplier_id
  };
}
