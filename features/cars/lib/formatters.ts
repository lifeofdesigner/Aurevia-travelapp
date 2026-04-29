import {formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type NormalizedCarOffer} from "../types";

export function formatCarDateTime(dateTime: string, locale: string) {
  return formatDateTime(dateTime, locale, {
    timeZone: "UTC"
  });
}

export function formatCarPrice(
  offer: Pick<NormalizedCarOffer, "totalAmount">,
  locale: string
) {
  return formatMoney(offer.totalAmount, locale);
}

export function getCarRentalDurationLabel(offer: NormalizedCarOffer) {
  const pickupAt = new Date(offer.pickupAt);
  const dropoffAt = new Date(offer.dropoffAt);
  const hours = Math.max(
    1,
    Math.round((dropoffAt.getTime() - pickupAt.getTime()) / (1000 * 60 * 60))
  );
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days === 0) {
    return `${hours}h`;
  }

  if (remainingHours === 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return `${days} day${days === 1 ? "" : "s"} ${remainingHours}h`;
}

export function getCarSpecsLabel(offer: NormalizedCarOffer) {
  return `${offer.seatCount} seats | ${offer.bagCount} bags | ${offer.transmissionType}`;
}
