import {
  TRANSFER_SORT_OPTIONS,
  TRANSFER_VEHICLE_CLASSES,
  type TransferResultsFilters,
  type TransferResultsMetadata,
  type TransferSearchResponse,
  type TransferVehicleClass
} from "../types";

export function parseTransferResultsFilters(
  searchParams: URLSearchParams
): TransferResultsFilters {
  const parseStringArray = (value: string | null) =>
    value
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
  const sortValue = searchParams.get("sort");
  const sort = TRANSFER_SORT_OPTIONS.includes(sortValue as TransferResultsFilters["sort"])
    ? (sortValue as TransferResultsFilters["sort"])
    : "recommended";
  const vehicleClasses = parseStringArray(searchParams.get("vehicleClasses")).filter(
    (value): value is TransferVehicleClass =>
      TRANSFER_VEHICLE_CLASSES.includes(value as TransferVehicleClass)
  );
  const priceMinValue = searchParams.get("priceMin");
  const priceMaxValue = searchParams.get("priceMax");
  const priceMin = priceMinValue ? Number(priceMinValue) : undefined;
  const priceMax = priceMaxValue ? Number(priceMaxValue) : undefined;

  return {
    meetAndGreetOnly: searchParams.get("meetAndGreetOnly") === "1",
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    sort,
    vehicleClasses
  };
}

export function buildTransferResultsMetadata(
  offers: TransferSearchResponse["offers"]
): TransferResultsMetadata {
  const classCounts = new Map<TransferVehicleClass, number>();
  const prices = offers.map((offer) => offer.totalAmount.amountMinor);

  for (const offer of offers) {
    classCounts.set(
      offer.vehicleClass,
      (classCounts.get(offer.vehicleClass) ?? 0) + 1
    );
  }

  return {
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,
    vehicleClasses: Array.from(classCounts.entries())
      .map(([key, count]) => ({count, key}))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  };
}

export function getFilteredTransferOffers(
  offers: TransferSearchResponse["offers"],
  filters: TransferResultsFilters
) {
  return offers
    .filter((offer) =>
      filters.vehicleClasses.length > 0
        ? filters.vehicleClasses.includes(offer.vehicleClass)
        : true
    )
    .filter((offer) =>
      filters.meetAndGreetOnly ? offer.meetAndGreetIncluded : true
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

      if (filters.sort === "capacity_desc") {
        return (
          right.passengerCapacity - left.passengerCapacity ||
          left.totalAmount.amountMinor - right.totalAmount.amountMinor
        );
      }

      return (
        right.passengerCapacity * 10 +
          right.luggageCapacity * 3 +
          (right.meetAndGreetIncluded ? 8 : 0) -
          right.totalAmount.amountMinor / 1000 -
          (left.passengerCapacity * 10 +
            left.luggageCapacity * 3 +
            (left.meetAndGreetIncluded ? 8 : 0) -
            left.totalAmount.amountMinor / 1000) ||
        left.totalAmount.amountMinor - right.totalAmount.amountMinor
      );
    });
}
