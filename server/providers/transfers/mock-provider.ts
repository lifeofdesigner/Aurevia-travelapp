import {type NormalizedTransferOffer, type TransferSearchCriteria} from "@/features/transfers/types";

import {mockTransferInventory, MOCK_TRANSFERS_SUPPLIER} from "./catalog";
import {mapMockTransferOffer} from "./map-mock-offer";
import {type ProviderTransferSearchContext, type TransferOfferProvider} from "./types";

export class MockTransferOfferProvider implements TransferOfferProvider {
  code = MOCK_TRANSFERS_SUPPLIER.code;

  async search(
    criteria: TransferSearchCriteria,
    context: ProviderTransferSearchContext
  ): Promise<NormalizedTransferOffer[]> {
    return mockTransferInventory
      .filter((inventoryItem) =>
        criteria.vehicleClass ? inventoryItem.vehicleClass === criteria.vehicleClass : true
      )
      .filter(
        (inventoryItem) =>
          criteria.passengerCount <= inventoryItem.passengerCapacity &&
          criteria.luggageCount <= inventoryItem.luggageCapacity
      )
      .map((inventoryItem) =>
        mapMockTransferOffer(inventoryItem, criteria, context, this.code)
      )
      .sort(
        (left, right) =>
          left.totalAmount.amountMinor - right.totalAmount.amountMinor ||
          right.passengerCapacity - left.passengerCapacity
      );
  }
}
