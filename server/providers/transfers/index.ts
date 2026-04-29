import {MockTransferOfferProvider} from "./mock-provider";

export const transferOfferProviders = [new MockTransferOfferProvider()] as const;

export function getDefaultTransferProvider() {
  return transferOfferProviders[0];
}
