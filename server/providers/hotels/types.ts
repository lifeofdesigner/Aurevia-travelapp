import {type HotelSearchCriteria, type NormalizedHotelOffer} from "@/features/hotels/types";

import {type HotelDestinationCatalogEntry} from "./catalog";

export type ProviderHotelSearchContext = {
  destination: HotelDestinationCatalogEntry;
  searchHash: string;
};

export interface HotelOfferProvider {
  code: string;
  search: (
    criteria: HotelSearchCriteria,
    context: ProviderHotelSearchContext
  ) => Promise<NormalizedHotelOffer[]>;
}
