import {formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type NormalizedTourOffer, type TourAvailabilitySlot} from "../types";

export function formatTourPrice(
  offer: Pick<NormalizedTourOffer, "priceFromTotalAmount">,
  locale: string
) {
  return formatMoney(offer.priceFromTotalAmount, locale);
}

export function formatTourDateTime(dateTime: string, locale: string) {
  return formatDateTime(dateTime, locale, {
    timeZone: "UTC"
  });
}

export function formatTourDuration(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function getTourSlotLabel(
  slot: TourAvailabilitySlot,
  locale: string
) {
  return `${slot.label} | ${formatTourDateTime(slot.startsAt, locale)}`;
}

export function getTourInclusionsSummary(offer: NormalizedTourOffer) {
  return offer.inclusions.slice(0, 3).join(", ");
}
