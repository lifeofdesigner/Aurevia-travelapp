import {
  CAR_CATEGORIES,
  CAR_FUEL_TYPES,
  CAR_SORT_OPTIONS,
  CAR_TRANSMISSIONS,
  type CarCategory,
  type CarFuelType,
  type CarResultsFilters,
  type CarResultsMetadata,
  type CarSearchResponse,
  type CarTransmission
} from "../types";

export function parseCarResultsFilters(searchParams: URLSearchParams): CarResultsFilters {
  const parseStringArray = (value: string | null) =>
    value
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  const sortValue = searchParams.get("sort");
  const sort = CAR_SORT_OPTIONS.includes(sortValue as CarResultsFilters["sort"])
    ? (sortValue as CarResultsFilters["sort"])
    : "recommended";
  const categories = parseStringArray(searchParams.get("categories")).filter(
    (value): value is CarCategory => CAR_CATEGORIES.includes(value as CarCategory)
  );
  const transmissions = parseStringArray(searchParams.get("transmissions")).filter(
    (value): value is CarTransmission =>
      CAR_TRANSMISSIONS.includes(value as CarTransmission)
  );
  const fuelTypes = parseStringArray(searchParams.get("fuelTypes")).filter(
    (value): value is CarFuelType => CAR_FUEL_TYPES.includes(value as CarFuelType)
  );
  const seatsMinValue = searchParams.get("seatsMin");
  const priceMinValue = searchParams.get("priceMin");
  const priceMaxValue = searchParams.get("priceMax");
  const seatsMin = seatsMinValue ? Number(seatsMinValue) : undefined;
  const priceMin = priceMinValue ? Number(priceMinValue) : undefined;
  const priceMax = priceMaxValue ? Number(priceMaxValue) : undefined;

  return {
    categories,
    fuelTypes,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    seatsMin: Number.isFinite(seatsMin) ? seatsMin : undefined,
    sort,
    transmissions
  };
}

export function buildCarResultsMetadata(
  offers: CarSearchResponse["offers"]
): CarResultsMetadata {
  const categoryCounts = new Map<CarCategory, number>();
  const transmissionCounts = new Map<CarTransmission, number>();
  const fuelCounts = new Map<CarFuelType, number>();
  const seatCounts = new Set<number>();
  const prices = offers.map((offer) => offer.totalAmount.amountMinor);

  for (const offer of offers) {
    seatCounts.add(offer.seatCount);
    categoryCounts.set(
      offer.vehicleCategory,
      (categoryCounts.get(offer.vehicleCategory) ?? 0) + 1
    );
    transmissionCounts.set(
      offer.transmissionType,
      (transmissionCounts.get(offer.transmissionType) ?? 0) + 1
    );
    fuelCounts.set(offer.fuelType, (fuelCounts.get(offer.fuelType) ?? 0) + 1);
  }

  return {
    categories: Array.from(categoryCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key)),
    fuelTypes: Array.from(fuelCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key)),
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,
    seatCounts: Array.from(seatCounts.values()).sort((left, right) => left - right),
    transmissions: Array.from(transmissionCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  };
}

export function getFilteredCarOffers(
  offers: CarSearchResponse["offers"],
  filters: CarResultsFilters
) {
  return offers
    .filter((offer) =>
      filters.categories.length > 0
        ? filters.categories.includes(offer.vehicleCategory)
        : true
    )
    .filter((offer) =>
      filters.transmissions.length > 0
        ? filters.transmissions.includes(offer.transmissionType)
        : true
    )
    .filter((offer) =>
      filters.fuelTypes.length > 0 ? filters.fuelTypes.includes(offer.fuelType) : true
    )
    .filter((offer) =>
      typeof filters.seatsMin === "number" ? offer.seatCount >= filters.seatsMin : true
    )
    .filter((offer) =>
      typeof filters.priceMin === "number"
        ? offer.totalAmount.amountMinor >= filters.priceMin
        : true
    )
    .filter((offer) =>
      typeof filters.priceMax === "number"
        ? offer.totalAmount.amountMinor <= filters.priceMax
        : true
    )
    .sort((left, right) => {
      if (filters.sort === "price_asc") {
        return left.totalAmount.amountMinor - right.totalAmount.amountMinor;
      }

      if (filters.sort === "seats_desc") {
        return (
          right.seatCount - left.seatCount ||
          left.totalAmount.amountMinor - right.totalAmount.amountMinor
        );
      }

      return (
        right.seatCount * 10 +
          right.bagCount * 3 -
          right.totalAmount.amountMinor / 1000 -
          (left.seatCount * 10 + left.bagCount * 3 - left.totalAmount.amountMinor / 1000) ||
        left.totalAmount.amountMinor - right.totalAmount.amountMinor
      );
    });
}
