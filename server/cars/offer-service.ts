import "server-only";

import {type Json} from "@/types/supabase";
import {type NormalizedCarOffer} from "@/features/cars/types";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

type CachedCarOfferRow = {
  expires_at: string;
  id: string;
  offer_payload: Json;
};

export async function getCachedCarOffer(offerId: string) {
  const admin = createSupabaseAdminClient();
  const offerResult = await admin
    .from("car_offer_cache")
    .select("id, offer_payload, expires_at")
    .eq("id", offerId)
    .maybeSingle();
  const cachedOffer = offerResult.data as CachedCarOfferRow | null;

  if (!cachedOffer) {
    return null;
  }

  if (new Date(cachedOffer.expires_at).getTime() < Date.now()) {
    return null;
  }

  return cachedOffer.offer_payload as unknown as NormalizedCarOffer;
}
