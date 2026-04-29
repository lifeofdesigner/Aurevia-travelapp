import {MockHotelOfferProvider} from "./mock-provider";

export const hotelOfferProviders = [new MockHotelOfferProvider()] as const;

export function getDefaultHotelProvider() {
  return hotelOfferProviders[0];
}
