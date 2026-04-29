import {hasDuffelAccessToken} from "./duffel-client";
import {MockFlightOfferProvider} from "./mock-provider";
import {duffelFlightOfferProvider} from "./search-duffel";

const mockFlightOfferProvider = new MockFlightOfferProvider();

export const flightOfferProviders = [
  duffelFlightOfferProvider,
  mockFlightOfferProvider
] as const;

export function getDefaultFlightProvider() {
  return hasDuffelAccessToken() ? duffelFlightOfferProvider : mockFlightOfferProvider;
}

export function getFlightProviderSearchOrder() {
  return hasDuffelAccessToken()
    ? [duffelFlightOfferProvider, mockFlightOfferProvider]
    : [mockFlightOfferProvider];
}
