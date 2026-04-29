import {type CarSearchCriteria, type NormalizedCarOffer} from "@/features/cars/types";
import {type MobilityLocationCatalogEntry} from "@/server/providers/mobility/locations";

export type ProviderCarSearchContext = {
  dropoffLocation: MobilityLocationCatalogEntry;
  pickupLocation: MobilityLocationCatalogEntry;
  searchHash: string;
};

export interface CarOfferProvider {
  code: string;
  search: (
    criteria: CarSearchCriteria,
    context: ProviderCarSearchContext
  ) => Promise<NormalizedCarOffer[]>;
}
