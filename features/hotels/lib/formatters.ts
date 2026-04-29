import {differenceInCalendarDays} from "./results";
import {formatDate} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type HotelRoomOption, type NormalizedHotelOffer} from "../types";

export function formatHotelDate(date: string, locale: string) {
  return formatDate(date, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function formatHotelStayDates(
  checkIn: string,
  checkOut: string,
  locale: string
) {
  return `${formatHotelDate(checkIn, locale)} - ${formatHotelDate(checkOut, locale)}`;
}

export function formatHotelPrice(
  roomOption: Pick<HotelRoomOption, "totalAmount">,
  locale: string
) {
  return formatMoney(roomOption.totalAmount, locale);
}

export function formatHotelLeadPrice(
  offer: Pick<NormalizedHotelOffer, "cheapestTotalAmount">,
  locale: string
) {
  return formatMoney(offer.cheapestTotalAmount, locale);
}

export function getHotelNightCount(checkIn: string, checkOut: string) {
  return differenceInCalendarDays(checkIn, checkOut);
}
