import {type MobilityLocationCatalogEntry} from "@/server/providers/mobility/locations";
import {type NormalizedTransferOffer, type TransferSearchCriteria} from "@/features/transfers/types";

export type ProviderTransferSearchContext = {
  airportLocation?: MobilityLocationCatalogEntry;
  dropoffLocation: MobilityLocationCatalogEntry;
  pickupLocation: MobilityLocationCatalogEntry;
  searchHash: string;
};

export interface TransferOfferProvider {
  code: string;
  search: (
    criteria: TransferSearchCriteria,
    context: ProviderTransferSearchContext
  ) => Promise<NormalizedTransferOffer[]>;
}
