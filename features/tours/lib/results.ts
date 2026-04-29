import {
  TOUR_CATEGORIES,
  TOUR_DURATION_OPTIONS,
  TOUR_SORT_OPTIONS,
  type TourCategory,
  type TourDurationOption,
  type TourResultsFilters,
  type TourResultsMetadata,
  type TourSearchResponse,
  type TourSortOption
} from "../types";

export function parseTourResultsFilters(searchParams: URLSearchParams): TourResultsFilters {
  const parseStringArray = (value: string | null) =>
    value
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
  const sortValue = searchParams.get("sort");
  const sort = TOUR_SORT_OPTIONS.includes(sortValue as TourSortOption)
    ? (sortValue as TourSortOption)
    : "recommended";
  const categories = parseStringArray(searchParams.get("categories")).filter(
    (value): value is TourCategory => TOUR_CATEGORIES.includes(value as TourCategory)
  );
  const durationOptions = parseStringArray(searchParams.get("durationOptions")).filter(
    (value): value is TourDurationOption =>
      TOUR_DURATION_OPTIONS.includes(value as TourDurationOption)
  );
  const priceMinValue = searchParams.get("priceMin");
  const priceMaxValue = searchParams.get("priceMax");
  const priceMin = priceMinValue ? Number(priceMinValue) : undefined;
  const priceMax = priceMaxValue ? Number(priceMaxValue) : undefined;

  return {
    categories,
    durationOptions,
    familyFriendly: searchParams.get("familyFriendly") === "1",
    groupFriendly: searchParams.get("groupFriendly") === "1",
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    privateAvailable: searchParams.get("privateAvailable") === "1",
    sort
  };
}

export function buildTourResultsMetadata(
  offers: TourSearchResponse["offers"]
): TourResultsMetadata {
  const categoryCounts = new Map<TourCategory, number>();
  const durationCounts = new Map<TourDurationOption, number>();
  const prices = offers.map((offer) => offer.priceFromTotalAmount.amountMinor);

  for (const offer of offers) {
    categoryCounts.set(
      offer.category,
      (categoryCounts.get(offer.category) ?? 0) + 1
    );
    durationCounts.set(
      offer.durationBucket,
      (durationCounts.get(offer.durationBucket) ?? 0) + 1
    );
  }

  return {
    categories: Array.from(categoryCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key)),
    durationOptions: Array.from(durationCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key)),
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0
  };
}

export function getFilteredTourOffers(
  offers: TourSearchResponse["offers"],
  filters: TourResultsFilters
) {
  return offers
    .filter((offer) =>
      filters.categories.length > 0 ? filters.categories.includes(offer.category) : true
    )
    .filter((offer) =>
      filters.durationOptions.length > 0
        ? filters.durationOptions.includes(offer.durationBucket)
        : true
    )
    .filter((offer) => (filters.familyFriendly ? offer.familyFriendly : true))
    .filter((offer) => (filters.privateAvailable ? offer.privateAvailable : true))
    .filter((offer) => (filters.groupFriendly ? offer.groupFriendly : true))
    .filter((offer) =>
      typeof filters.priceMin === "number"
        ? offer.priceFromTotalAmount.amountMinor >= filters.priceMin
        : true
    )
    .filter((offer) =>
      typeof filters.priceMax === "number"
        ? offer.priceFromTotalAmount.amountMinor <= filters.priceMax
        : true
    )
    .sort((left, right) => {
      if (filters.sort === "price_asc") {
        return left.priceFromTotalAmount.amountMinor - right.priceFromTotalAmount.amountMinor;
      }

      if (filters.sort === "rating_desc") {
        return (
          right.reviewRating - left.reviewRating ||
          right.reviewCount - left.reviewCount ||
          left.priceFromTotalAmount.amountMinor - right.priceFromTotalAmount.amountMinor
        );
      }

      if (filters.sort === "duration_asc") {
        return (
          left.durationMinutes - right.durationMinutes ||
          left.priceFromTotalAmount.amountMinor - right.priceFromTotalAmount.amountMinor
        );
      }

      return (
        right.reviewRating * 10 +
          right.reviewCount / 50 +
          (right.privateAvailable ? 3 : 0) +
          (right.familyFriendly ? 2 : 0) -
          right.priceFromTotalAmount.amountMinor / 1000 -
          (left.reviewRating * 10 +
            left.reviewCount / 50 +
            (left.privateAvailable ? 3 : 0) +
            (left.familyFriendly ? 2 : 0) -
            left.priceFromTotalAmount.amountMinor / 1000) ||
        left.priceFromTotalAmount.amountMinor - right.priceFromTotalAmount.amountMinor
      );
    });
}
