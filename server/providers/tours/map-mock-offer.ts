import {calculateVatFromNet} from "@/lib/vat";
import {type SupportedCurrency} from "@/lib/money";
import {type NormalizedTourOffer, type TourAddOn, type TourAvailabilitySlot, type TourSearchCriteria} from "@/features/tours/types";

import {type MockTourCatalogItem} from "./catalog";
import {type ProviderTourSearchContext} from "./types";

const currencyRates: Record<SupportedCurrency, number> = {
  AED: 3.97,
  EUR: 1,
  GBP: 0.86,
  NGN: 1685,
  USD: 1.08
};

function convertFromEur(amountMinor: number, currency: SupportedCurrency) {
  return Math.round(amountMinor * currencyRates[currency]);
}

function buildDateTime(serviceDate: string, hour: number, minute: number) {
  return new Date(
    `${serviceDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`
  ).toISOString();
}

function buildSlotId(activityCode: string, startsAt: string) {
  return `${activityCode}:${startsAt}`;
}

function buildPriceBreakdown(amountMinorEur: number, currency: SupportedCurrency) {
  const vat = calculateVatFromNet(amountMinorEur, "EUR");

  return {
    subtotalAmount: {
      amountMinor: convertFromEur(vat.net.amountMinor, currency),
      currency
    },
    taxAmount: {
      amountMinor: convertFromEur(vat.vat.amountMinor, currency),
      currency
    },
    totalAmount: {
      amountMinor: convertFromEur(vat.gross.amountMinor, currency),
      currency
    }
  };
}

function buildAvailabilitySlots(
  activity: MockTourCatalogItem,
  criteria: TourSearchCriteria
): TourAvailabilitySlot[] {
  return activity.scheduleTemplate.map((slotTemplate) => {
    const startsAt = buildDateTime(
      criteria.serviceDate,
      slotTemplate.startHour,
      slotTemplate.startMinute
    );
    const endsAt = new Date(
      new Date(startsAt).getTime() + activity.durationMinutes * 60 * 1000
    ).toISOString();

    return {
      endsAt,
      label: slotTemplate.label,
      remainingCapacity: slotTemplate.remainingCapacity,
      slotId: buildSlotId(activity.activityCode, startsAt),
      soldOut: slotTemplate.remainingCapacity === 0,
      startsAt
    };
  });
}

function buildAddOns(
  activity: MockTourCatalogItem,
  currency: SupportedCurrency
): TourAddOn[] {
  return activity.addOnTemplates.map((template) => ({
    code: template.code,
    description: template.description,
    ...buildPriceBreakdown(template.eurPriceMinor, currency),
    title: template.title
  }));
}

export function mapMockTourOffer(
  activity: MockTourCatalogItem,
  criteria: TourSearchCriteria,
  context: ProviderTourSearchContext,
  supplierCode: string
): NormalizedTourOffer {
  const adultPrice = buildPriceBreakdown(activity.baseAdultRateEurMinor, criteria.currency);
  const childPrice = buildPriceBreakdown(activity.baseChildRateEurMinor, criteria.currency);
  const availabilitySlots = buildAvailabilitySlots(activity, criteria);
  const addOns = buildAddOns(activity, criteria.currency);
  const supplierOfferId = [
    supplierCode,
    activity.activityCode,
    context.destination.slug,
    criteria.serviceDate
  ].join(":");

  return {
    addOns,
    adultPrice,
    availabilitySlots,
    cancellationPolicy: activity.cancellationPolicy,
    category: activity.category,
    childPrice,
    cityName: activity.cityName,
    countryCode: activity.countryCode,
    countryName: activity.countryName,
    description: activity.description,
    destinationId: activity.destinationId,
    durationBucket: activity.durationBucket,
    durationMinutes: activity.durationMinutes,
    exclusions: activity.exclusions,
    familyFriendly: activity.familyFriendly,
    faqs: activity.faqs,
    groupFriendly: activity.groupFriendly,
    highlights: activity.highlights,
    id: supplierOfferId,
    images: activity.images,
    inclusions: activity.inclusions,
    meetingInstructions: activity.meetingInstructions,
    meetingPoint: activity.meetingPoint,
    overview: activity.overview,
    priceFromTotalAmount: adultPrice.totalAmount,
    privateAvailable: activity.privateAvailable,
    reviewCount: activity.reviewCount,
    reviewRating: activity.reviewRating,
    searchHash: context.searchHash,
    serviceDate: criteria.serviceDate,
    supplierCode,
    supplierOfferId,
    ticketDeliveryMethod: activity.ticketDeliveryMethod,
    title: activity.title
  };
}
