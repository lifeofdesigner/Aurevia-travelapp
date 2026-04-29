import {formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type NormalizedTransferOffer} from "../types";

export function formatTransferDateTime(dateTime: string, locale: string) {
  return formatDateTime(dateTime, locale, {
    timeZone: "UTC"
  });
}

export function formatTransferPrice(
  offer: Pick<NormalizedTransferOffer, "totalAmount">,
  locale: string
) {
  return formatMoney(offer.totalAmount, locale);
}

export function getTransferCapacityLabel(offer: NormalizedTransferOffer) {
  return `${offer.passengerCapacity} passengers | ${offer.luggageCapacity} bags`;
}
