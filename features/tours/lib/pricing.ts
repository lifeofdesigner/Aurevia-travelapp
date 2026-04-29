import {type Money} from "@/lib/money";

import {type NormalizedTourOffer, type TourAddOn, type TourAvailabilitySlot} from "../types";

type TourBookingSelection = {
  adults: number;
  children: number;
  selectedAddOnCodes: string[];
  slotId: string;
};

export type TourBookingQuote = {
  participantTotal: number;
  selectedAddOns: TourAddOn[];
  selectedSlot: TourAvailabilitySlot;
  subtotalAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
};

function money(amountMinor: number, currency: Money["currency"]): Money {
  return {
    amountMinor,
    currency
  };
}

export function buildTourBookingQuote(
  offer: NormalizedTourOffer,
  selection: TourBookingSelection
): TourBookingQuote {
  const selectedSlot = offer.availabilitySlots.find(
    (availabilitySlot) => availabilitySlot.slotId === selection.slotId
  );

  if (!selectedSlot || selectedSlot.soldOut) {
    throw new Error("The selected activity slot is no longer available.");
  }

  const participantTotal = selection.adults + selection.children;

  if (participantTotal < 1 || participantTotal > selectedSlot.remainingCapacity) {
    throw new Error("The selected activity slot no longer has enough capacity.");
  }

  const selectedAddOns = offer.addOns.filter((addOn) =>
    selection.selectedAddOnCodes.includes(addOn.code)
  );
  const subtotalAmountMinor =
    selection.adults * offer.adultPrice.subtotalAmount.amountMinor +
    selection.children * offer.childPrice.subtotalAmount.amountMinor +
    selectedAddOns.reduce((total, addOn) => total + addOn.subtotalAmount.amountMinor, 0);
  const taxAmountMinor =
    selection.adults * offer.adultPrice.taxAmount.amountMinor +
    selection.children * offer.childPrice.taxAmount.amountMinor +
    selectedAddOns.reduce((total, addOn) => total + addOn.taxAmount.amountMinor, 0);
  const totalAmountMinor =
    selection.adults * offer.adultPrice.totalAmount.amountMinor +
    selection.children * offer.childPrice.totalAmount.amountMinor +
    selectedAddOns.reduce((total, addOn) => total + addOn.totalAmount.amountMinor, 0);
  const currency = offer.priceFromTotalAmount.currency;

  return {
    participantTotal,
    selectedAddOns,
    selectedSlot,
    subtotalAmount: money(subtotalAmountMinor, currency),
    taxAmount: money(taxAmountMinor, currency),
    totalAmount: money(totalAmountMinor, currency)
  };
}
