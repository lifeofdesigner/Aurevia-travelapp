import "server-only";

import {type Json} from "@/types/supabase";
import {type NormalizedTourOffer} from "@/features/tours/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

type CachedTourOfferRow = {
  destination_id: string;
  expires_at: string;
  id: string;
  offer_payload: Json;
  service_date: string;
  supplier_id: string;
  supplier_offer_id: string;
};

export async function getCachedTourOffer(offerId: string) {
  const admin = createSupabaseAdminClient();
  const offerResult = await admin
    .from("tour_offer_cache")
    .select("id, offer_payload, destination_id, service_date, supplier_id, supplier_offer_id, expires_at")
    .eq("id", offerId)
    .maybeSingle();
  const cachedOffer = offerResult.data as CachedTourOfferRow | null;

  if (!cachedOffer) {
    return null;
  }

  if (new Date(cachedOffer.expires_at).getTime() < Date.now()) {
    return null;
  }

  const relatedRowsResult = await admin
    .from("tour_offer_cache")
    .select("id, supplier_offer_id, offer_payload, expires_at")
    .eq("supplier_id", cachedOffer.supplier_id)
    .eq("destination_id", cachedOffer.destination_id)
    .eq("service_date", cachedOffer.service_date);
  const relatedRows =
    (relatedRowsResult.data as Array<{
      expires_at: string;
      id: string;
      offer_payload: Json;
      supplier_offer_id: string;
    }> | null) ??
    [];
  const relatedActivities = relatedRows
    .filter((row) => new Date(row.expires_at).getTime() >= Date.now())
    .filter((row) => row.id !== cachedOffer.id)
    .map((row) => ({
      ...(row.offer_payload as unknown as NormalizedTourOffer),
      id: row.id
    }))
    .filter(
      (offer, index, offers) =>
        offers.findIndex((entry) => entry.supplierOfferId === offer.supplierOfferId) === index
    )
    .slice(0, 3);

  return {
    offer: {
      ...(cachedOffer.offer_payload as unknown as NormalizedTourOffer),
      id: cachedOffer.id
    },
    relatedActivities
  };
}
