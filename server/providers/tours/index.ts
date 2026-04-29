import {MockTourOfferProvider} from "./mock-provider";

export const tourOfferProviders = [new MockTourOfferProvider()] as const;

export function getDefaultTourProvider() {
  return tourOfferProviders[0];
}
