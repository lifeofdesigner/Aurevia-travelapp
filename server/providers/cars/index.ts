import {MockCarOfferProvider} from "./mock-provider";

export const carOfferProviders = [new MockCarOfferProvider()] as const;

export function getDefaultCarProvider() {
  return carOfferProviders[0];
}
