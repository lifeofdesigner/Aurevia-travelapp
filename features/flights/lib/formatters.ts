import {formatDate, formatDateTime} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type NormalizedFlightOffer} from "../types";

export function formatFlightDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatFlightDate(date: string, locale: string) {
  return formatDate(date, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function formatFlightDateTime(
  dateTime: string,
  locale: string,
  timeZone: string
) {
  return formatDateTime(dateTime, locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  });
}

export function formatFlightTime(
  dateTime: string,
  locale: string,
  timeZone: string
) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(new Date(dateTime));
}

export function formatFlightPrice(
  offer: Pick<NormalizedFlightOffer, "totalAmount">,
  locale: string
) {
  return formatMoney(offer.totalAmount, locale);
}

export function getOfferRouteLabel(offer: NormalizedFlightOffer) {
  return `${offer.originAirportCode} to ${offer.destinationAirportCode}`;
}

export function getPassengerSummaryLabel(
  passengerCounts: NormalizedFlightOffer["passengerCounts"]
) {
  return [
    passengerCounts.adults > 0
      ? `${passengerCounts.adults} adult${passengerCounts.adults === 1 ? "" : "s"}`
      : null,
    passengerCounts.children > 0
      ? `${passengerCounts.children} child${passengerCounts.children === 1 ? "" : "ren"}`
      : null,
    passengerCounts.infants > 0
      ? `${passengerCounts.infants} infant${passengerCounts.infants === 1 ? "" : "s"}`
      : null
  ]
    .filter(Boolean)
    .join(", ");
}
