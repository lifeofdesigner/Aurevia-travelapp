import {type CarSearchCriteria, type NormalizedCarOffer} from "@/features/cars/types";

import {mockCarInventory, MOCK_CARS_SUPPLIER} from "./catalog";
import {mapMockCarOffer} from "./map-mock-offer";
import {type CarOfferProvider, type ProviderCarSearchContext} from "./types";

export class MockCarOfferProvider implements CarOfferProvider {
  code = MOCK_CARS_SUPPLIER.code;

  async search(
    criteria: CarSearchCriteria,
    context: ProviderCarSearchContext
  ): Promise<NormalizedCarOffer[]> {
    return mockCarInventory
      .filter((inventoryItem) =>
        criteria.preferredCategory
          ? inventoryItem.vehicleCategory === criteria.preferredCategory
          : true
      )
      .filter((inventoryItem) => criteria.driverAge >= inventoryItem.driverAgeMin)
      .map((inventoryItem) =>
        mapMockCarOffer(inventoryItem, criteria, context, this.code)
      )
      .sort(
        (left, right) =>
          left.totalAmount.amountMinor - right.totalAmount.amountMinor ||
          right.seatCount - left.seatCount
      );
  }
}
