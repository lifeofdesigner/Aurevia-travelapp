import {type NormalizedTourOffer, type TourSearchCriteria} from "@/features/tours/types";

import {type TourDestinationCatalogEntry} from "./catalog";

export type ProviderTourSearchContext = {
  destination: TourDestinationCatalogEntry;
  searchHash: string;
};

export interface TourOfferProvider {
  code: string;
  search: (
    criteria: TourSearchCriteria,
    context: ProviderTourSearchContext
  ) => Promise<NormalizedTourOffer[]>;
}
