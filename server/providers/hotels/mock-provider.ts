import {type HotelSearchCriteria, type NormalizedHotelOffer} from "@/features/hotels/types";

import {mapMockHotelPropertyToOffer} from "./map-mock-property";
import {mockHotelCatalog, MOCK_HOTELS_SUPPLIER} from "./catalog";
import {type HotelOfferProvider, type ProviderHotelSearchContext} from "./types";

export class MockHotelOfferProvider implements HotelOfferProvider {
  code = MOCK_HOTELS_SUPPLIER.code;

  async search(
    criteria: HotelSearchCriteria,
    context: ProviderHotelSearchContext
  ): Promise<NormalizedHotelOffer[]> {
    return mockHotelCatalog
      .filter((property) => property.cityId === context.destination.cityId)
      .filter((property) =>
        typeof criteria.preferredStarRating === "number"
          ? property.starRating >= criteria.preferredStarRating
          : true
      )
      .filter((property) =>
        criteria.propertyType ? property.propertyType === criteria.propertyType : true
      )
      .map((property) =>
        mapMockHotelPropertyToOffer(property, criteria, context, this.code)
      )
      .filter((offer): offer is NormalizedHotelOffer => Boolean(offer))
      .sort(
        (left, right) =>
          right.starRating - left.starRating ||
          right.guestRating - left.guestRating ||
          left.cheapestTotalAmount.amountMinor - right.cheapestTotalAmount.amountMinor
      );
  }
}
