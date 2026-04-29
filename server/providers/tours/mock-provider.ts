import {type NormalizedTourOffer, type TourSearchCriteria} from "@/features/tours/types";

import {mapMockTourOffer} from "./map-mock-offer";
import {mockTourCatalog, MOCK_TOURS_SUPPLIER} from "./catalog";
import {type ProviderTourSearchContext, type TourOfferProvider} from "./types";

export class MockTourOfferProvider implements TourOfferProvider {
  code = MOCK_TOURS_SUPPLIER.code;

  async search(
    criteria: TourSearchCriteria,
    context: ProviderTourSearchContext
  ): Promise<NormalizedTourOffer[]> {
    return mockTourCatalog
      .filter((activity) => activity.destinationId === context.destination.destinationId)
      .filter((activity) =>
        criteria.category ? activity.category === criteria.category : true
      )
      .filter((activity) =>
        criteria.duration ? activity.durationBucket === criteria.duration : true
      )
      .map((activity) => mapMockTourOffer(activity, criteria, context, this.code))
      .filter((offer) => offer.availabilitySlots.some((slot) => !slot.soldOut))
      .sort(
        (left, right) =>
          right.reviewRating - left.reviewRating ||
          right.reviewCount - left.reviewCount ||
          left.priceFromTotalAmount.amountMinor - right.priceFromTotalAmount.amountMinor
      );
  }
}
