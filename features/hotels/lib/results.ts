import {
  HOTEL_SORT_OPTIONS,
  type HotelAmenity,
  type HotelResultsFilters,
  type HotelResultsMetadata,
  type HotelRoomOption,
  type HotelSearchResponse,
  type NormalizedHotelOffer
} from "../types";

export type FilteredHotelOffer = NormalizedHotelOffer & {
  displayRoom: HotelRoomOption;
};

export function differenceInCalendarDays(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);

  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function parseNumericArray(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function parseStringArray(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseHotelResultsFilters(
  searchParams: URLSearchParams
): HotelResultsFilters {
  const sortValue = searchParams.get("sort");
  const sort = HOTEL_SORT_OPTIONS.includes(
    sortValue as HotelResultsFilters["sort"]
  )
    ? (sortValue as HotelResultsFilters["sort"])
    : "recommended";
  const viewValue = searchParams.get("view");
  const view = viewValue === "list" ? "list" : "grid";
  const amenities = parseStringArray(searchParams.get("amenities")).filter(
    (value): value is HotelAmenity =>
      [
        "wifi",
        "spa",
        "pool",
        "gym",
        "breakfast",
        "parking",
        "concierge",
        "transfer"
      ].includes(value)
  );
  const priceMinValue = searchParams.get("priceMin");
  const priceMaxValue = searchParams.get("priceMax");
  const priceMin = priceMinValue ? Number(priceMinValue) : undefined;
  const priceMax = priceMaxValue ? Number(priceMaxValue) : undefined;

  return {
    amenities,
    breakfastIncluded: searchParams.get("breakfastIncluded") === "1",
    neighborhoods: parseStringArray(searchParams.get("neighborhoods")),
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    refundable: searchParams.get("refundable") === "1",
    sort,
    stars: parseNumericArray(searchParams.get("stars")),
    view
  };
}

export function buildHotelResultsMetadata(
  offers: NormalizedHotelOffer[]
): HotelResultsMetadata {
  const amenityCounts = new Map<HotelAmenity, number>();
  const neighborhoodCounts = new Map<string, number>();
  const starRatings = new Set<number>();
  const propertyTypes = new Set<NormalizedHotelOffer["propertyType"]>();
  const prices = offers.map((offer) => offer.cheapestTotalAmount.amountMinor);

  for (const offer of offers) {
    starRatings.add(offer.starRating);
    propertyTypes.add(offer.propertyType);
    neighborhoodCounts.set(
      offer.neighborhood,
      (neighborhoodCounts.get(offer.neighborhood) ?? 0) + 1
    );

    for (const amenity of offer.amenities) {
      amenityCounts.set(amenity, (amenityCounts.get(amenity) ?? 0) + 1);
    }
  }

  return {
    amenities: Array.from(amenityCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key)),
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,
    neighborhoods: Array.from(neighborhoodCounts.entries())
      .map(([name, count]) => ({count, name}))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    propertyTypes: Array.from(propertyTypes.values()).sort(),
    starRatings: Array.from(starRatings.values()).sort((left, right) => right - left)
  };
}

function roomMatchesFilters(room: HotelRoomOption, filters: HotelResultsFilters) {
  if (filters.refundable && !room.refundable) {
    return false;
  }

  if (filters.breakfastIncluded && !room.breakfastIncluded) {
    return false;
  }

  if (
    typeof filters.priceMin === "number" &&
    room.totalAmount.amountMinor < filters.priceMin
  ) {
    return false;
  }

  if (
    typeof filters.priceMax === "number" &&
    room.totalAmount.amountMinor > filters.priceMax
  ) {
    return false;
  }

  return true;
}

function offerMatchesFilters(offer: NormalizedHotelOffer, filters: HotelResultsFilters) {
  if (filters.stars.length > 0 && !filters.stars.includes(offer.starRating)) {
    return false;
  }

  if (
    filters.neighborhoods.length > 0 &&
    !filters.neighborhoods.includes(offer.neighborhood)
  ) {
    return false;
  }

  if (
    filters.amenities.length > 0 &&
    !filters.amenities.every((amenity) => offer.amenities.includes(amenity))
  ) {
    return false;
  }

  return true;
}

function getRecommendedScore(offer: NormalizedHotelOffer, room: HotelRoomOption) {
  return offer.starRating * 100 + Math.round(offer.guestRating * 10) - room.totalAmount.amountMinor / 1000;
}

export function getFilteredHotelOffers(
  offers: HotelSearchResponse["offers"],
  filters: HotelResultsFilters
): FilteredHotelOffer[] {
  const filteredOffers: FilteredHotelOffer[] = [];

  for (const offer of offers) {
    if (!offerMatchesFilters(offer, filters)) {
      continue;
    }

    const matchingRooms = offer.roomOptions
      .filter((room) => roomMatchesFilters(room, filters))
      .sort((left, right) => left.totalAmount.amountMinor - right.totalAmount.amountMinor);

    if (matchingRooms.length === 0) {
      continue;
    }

    filteredOffers.push({
      ...offer,
      breakfastIncluded: matchingRooms.some((room) => room.breakfastIncluded),
      cheapestSubtotalAmount: matchingRooms[0].subtotalAmount,
      cheapestTaxAmount: matchingRooms[0].taxAmount,
      cheapestTotalAmount: matchingRooms[0].totalAmount,
      displayRoom: matchingRooms[0],
      refundable: matchingRooms.some((room) => room.refundable),
      roomOptions: matchingRooms
    });
  }

  return filteredOffers.sort((left, right) => {
    if (filters.sort === "price_asc") {
      return (
        left.displayRoom.totalAmount.amountMinor - right.displayRoom.totalAmount.amountMinor
      );
    }

    if (filters.sort === "rating_desc") {
      return (
        right.guestRating - left.guestRating ||
        right.starRating - left.starRating ||
        left.displayRoom.totalAmount.amountMinor - right.displayRoom.totalAmount.amountMinor
      );
    }

    return (
      getRecommendedScore(right, right.displayRoom) -
        getRecommendedScore(left, left.displayRoom) ||
      left.displayRoom.totalAmount.amountMinor - right.displayRoom.totalAmount.amountMinor
    );
  });
}
