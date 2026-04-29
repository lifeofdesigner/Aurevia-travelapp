"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {ArrowUpDown, Minus, Plus, Search} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {useCurrency} from "@/lib/currency/use-currency";
import {toIsoDate} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {CABIN_CLASSES, FLIGHT_TRIP_TYPES, type CabinClass} from "@/types/database-enums";

import {normalizeFlightAirportValue} from "../lib/airports-data";
import {type FlightSearchParams} from "../lib/flight-types";
import {type FlightSearchCriteria} from "../types";
import {AirportSearchInput} from "./airport-search-input";
import {FlightDatePicker} from "./flight-date-picker";

type FlightFormTripType = (typeof FLIGHT_TRIP_TYPES)[number];

type FlightSearchFormValues = {
  cabinClass: CabinClass;
  departureDate: Date | null;
  destination: string;
  origin: string;
  passengers: number;
  returnDate: Date | null;
  tripType: FlightFormTripType;
};

type MultiCitySegmentValue = {
  departureDate: Date | null;
  destination: string;
  id: string;
  origin: string;
};

type FlightSearchFormProps = {
  defaultValues?: Partial<FlightSearchCriteria>;
  locale: Locale;
  onSearch?: (params: FlightSearchParams) => void | Promise<void>;
  submitLabel?: string;
};

const INTERNATIONAL_ROUTE_OPTIONS = [
  {destination: "DXB", label: "Vienna to Dubai", origin: "VIE"},
  {destination: "JFK", label: "Vienna to New York", origin: "VIE"},
  {destination: "LHR", label: "Dubai to London", origin: "DXB"},
  {destination: "JFK", label: "London to New York", origin: "LHR"},
  {destination: "SIN", label: "Dubai to Singapore", origin: "DXB"}
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseDateString(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getInitialPassengerCount(defaultValues?: Partial<FlightSearchCriteria>) {
  const total =
    (defaultValues?.adults ?? 1) +
    (defaultValues?.children ?? 0) +
    (defaultValues?.infants ?? 0);

  return clamp(total, 1, 9);
}

function getPassengerLabel(passengers: number) {
  return `${passengers} passenger${passengers === 1 ? "" : "s"}`;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function mapTripType(tripType: FlightFormTripType): FlightSearchParams["tripType"] {
  if (tripType === "round_trip") {
    return "round";
  }

  if (tripType === "multi_city") {
    return "multi";
  }

  return "oneway";
}

function createMultiCitySegment(origin = ""): MultiCitySegmentValue {
  return {
    departureDate: null,
    destination: "",
    id: `segment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    origin
  };
}

function getInitialMultiCitySegments(
  defaultValues?: Partial<FlightSearchCriteria>
): MultiCitySegmentValue[] {
  const additionalSegments =
    defaultValues?.multiCitySegments?.slice(1).map((segment, index) => ({
      departureDate: parseDateString(segment.departureDate),
      destination: normalizeFlightAirportValue(segment.destination),
      id: `segment-${index + 2}`,
      origin: normalizeFlightAirportValue(segment.origin)
    })) ?? [];

  if (additionalSegments.length > 0) {
    return additionalSegments;
  }

  return [
    {
      departureDate: null,
      destination: "",
      id: "segment-2",
      origin: normalizeFlightAirportValue(defaultValues?.destination ?? "")
    }
  ];
}

function isAirportCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

export function FlightSearchForm({
  defaultValues,
  locale,
  onSearch,
  submitLabel
}: FlightSearchFormProps) {
  const router = useRouter();
  const {searchCurrency} = useCurrency();
  const t = useTranslations("Flights.searchForm");
  const schema = z
    .object({
      tripType: z.enum(FLIGHT_TRIP_TYPES),
      origin: z
        .string()
        .trim()
        .regex(/^[A-Z]{3}$/, "Choose a departure airport."),
      destination: z
        .string()
        .trim()
        .regex(/^[A-Z]{3}$/, "Choose an arrival airport."),
      departureDate: z.date().nullable(),
      returnDate: z.date().nullable(),
      cabinClass: z.enum(CABIN_CLASSES),
      passengers: z.number().int().min(1).max(9)
    })
    .superRefine((value, context) => {
      if (!value.departureDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.dateRequired"),
          path: ["departureDate"]
        });
      }

      if (
        value.origin.trim().length > 0 &&
        value.destination.trim().length > 0 &&
        value.origin.trim().toLowerCase() === value.destination.trim().toLowerCase()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.destinationMustDiffer"),
          path: ["destination"]
        });
      }

      if (value.tripType === "round_trip" && !value.returnDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.returnDateRequired"),
          path: ["returnDate"]
        });
      }

      if (
        value.tripType === "round_trip" &&
        value.departureDate &&
        value.returnDate &&
        startOfDay(value.returnDate).getTime() < startOfDay(value.departureDate).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.returnAfterDeparture"),
          path: ["returnDate"]
        });
      }
    });
  const {
    control,
    formState: {errors, isSubmitting},
    getValues,
    handleSubmit,
    register,
    setValue,
    watch
  } = useForm<FlightSearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cabinClass: defaultValues?.cabinClass ?? "economy",
      departureDate: parseDateString(defaultValues?.departureDate),
      destination: normalizeFlightAirportValue(defaultValues?.destination ?? ""),
      origin: normalizeFlightAirportValue(defaultValues?.origin ?? ""),
      passengers: getInitialPassengerCount(defaultValues),
      returnDate: parseDateString(defaultValues?.returnDate),
      tripType: defaultValues?.tripType ?? "round_trip"
    }
  });
  const tripType = watch("tripType");
  const passengers = watch("passengers");
  const firstDestination = watch("destination");
  const [swapRotation, setSwapRotation] = useState(0);
  const [multiCityError, setMultiCityError] = useState<string | null>(null);
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegmentValue[]>(
    () => getInitialMultiCitySegments(defaultValues)
  );

  useEffect(() => {
    if (tripType !== "multi_city" || !firstDestination) {
      return;
    }

    setMultiCitySegments((current) =>
      current.map((segment, index) =>
        index === 0 && !segment.origin
          ? {
              ...segment,
              origin: firstDestination
            }
          : segment
      )
    );
  }, [firstDestination, tripType]);

  function handleSwapAirports() {
    const currentOrigin = getValues("origin");
    const currentDestination = getValues("destination");

    setSwapRotation((current) => current + 180);
    setValue("origin", currentDestination, {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue("destination", currentOrigin, {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function handleQuickRouteSelect(origin: string, destination: string) {
    setValue("origin", origin, {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue("destination", destination, {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function handlePassengerChange(nextValue: number) {
    setValue("passengers", clamp(nextValue, 1, 9), {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function updateMultiCitySegment(
    segmentId: string,
    values: Partial<Omit<MultiCitySegmentValue, "id">>
  ) {
    setMultiCitySegments((current) =>
      current.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              ...values
            }
          : segment
      )
    );
    setMultiCityError(null);
  }

  function addMultiCitySegment() {
    const previousSegment = multiCitySegments[multiCitySegments.length - 1];
    setMultiCitySegments((current) => [
      ...current,
      createMultiCitySegment(previousSegment?.destination ?? "")
    ]);
  }

  function removeMultiCitySegment(segmentId: string) {
    setMultiCitySegments((current) =>
      current.length <= 1 ? current : current.filter((segment) => segment.id !== segmentId)
    );
  }

  function getMultiCityLegs(values: FlightSearchFormValues) {
    return [
      {
        departureDate: values.departureDate,
        destination: values.destination,
        origin: values.origin
      },
      ...multiCitySegments.map(({departureDate, destination, origin}) => ({
        departureDate,
        destination,
        origin
      }))
    ];
  }

  function validateMultiCityLegs(values: FlightSearchFormValues) {
    const legs = getMultiCityLegs(values);

    if (legs.length < 2) {
      return "Add at least two complete flight segments for multi-city search.";
    }

    for (const [index, leg] of legs.entries()) {
      if (!isAirportCode(leg.origin) || !isAirportCode(leg.destination) || !leg.departureDate) {
        return `Complete origin, destination, and date for segment ${index + 1}.`;
      }

      if (leg.origin === leg.destination) {
        return `Segment ${index + 1} must use different origin and destination airports.`;
      }

      const previousLeg = legs[index - 1];

      if (
        previousLeg?.departureDate &&
        leg.departureDate &&
        startOfDay(leg.departureDate).getTime() <
          startOfDay(previousLeg.departureDate).getTime()
      ) {
        return `Segment ${index + 1} date cannot be before the previous segment.`;
      }
    }

    return null;
  }

  async function onSubmit(values: FlightSearchFormValues) {
    const multiCityValidationError =
      values.tripType === "multi_city" ? validateMultiCityLegs(values) : null;

    if (multiCityValidationError) {
      setMultiCityError(multiCityValidationError);
      return;
    }

    setMultiCityError(null);

    const params: FlightSearchParams = {
      cabin: values.cabinClass,
      departureDate: values.departureDate ? toIsoDate(values.departureDate) : "",
      from: values.origin,
      passengers: values.passengers,
      to: values.destination,
      tripType: mapTripType(values.tripType)
    };

    if (values.tripType === "round_trip" && values.returnDate) {
      params.returnDate = toIsoDate(values.returnDate);
    }

    if (onSearch) {
      await onSearch(params);
      return;
    }

    const searchParams = new URLSearchParams({
      adults: String(values.passengers),
      cabinClass: values.cabinClass,
      children: "0",
      currency: searchCurrency,
      departureDate: params.departureDate,
      destination: values.destination,
      infants: "0",
      origin: values.origin,
      tripType: values.tripType
    });

    if (values.tripType === "round_trip" && values.returnDate) {
      searchParams.set("returnDate", toIsoDate(values.returnDate));
    }

    if (values.tripType === "multi_city") {
      searchParams.set(
        "segments",
        getMultiCityLegs(values)
          .map((leg) =>
            [
              leg.origin,
              leg.destination,
              leg.departureDate ? toIsoDate(leg.departureDate) : ""
            ].join(":")
          )
          .join("|")
      );
    }

    router.push(`${getLocalizedPath(ROUTES.flights, locale)}?${searchParams.toString()}`);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-lg border border-border/80 bg-background/60 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-5">
          <Controller
            name="tripType"
            control={control}
            render={({field}) => (
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground">
                  {t("tripTypeLabel")}
                </legend>

                <div className="flex flex-wrap gap-2">
                  {[
                    {label: t("tripTypeOptions.round_trip"), value: "round_trip"},
                    {label: t("tripTypeOptions.one_way"), value: "one_way"},
                    {label: "Multi-city", value: "multi_city"}
                  ].map((option) => {
                    const isActive = field.value === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          isActive
                            ? "rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
                            : "rounded-lg border border-border/80 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        }
                        onClick={() => {
                          field.onChange(option.value);

                          if (option.value !== "round_trip") {
                            setValue("returnDate", null, {
                              shouldDirty: true,
                              shouldValidate: true
                            });
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-end">
            <div>
              <Controller
                name="origin"
                control={control}
                render={({field}) => (
                  <AirportSearchInput
                    label={t("originLabel")}
                    placeholder={t("originPlaceholder")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FormFieldError id="flight-origin-error" message={errors.origin?.message} />
            </div>

            <div className="flex justify-center xl:pb-[0.38rem]">
              <button
                type="button"
                aria-label="Swap airports"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={handleSwapAirports}
              >
                <ArrowUpDown
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300"
                  style={{transform: `rotate(${swapRotation}deg)`}}
                />
              </button>
            </div>

            <div>
              <Controller
                name="destination"
                control={control}
                render={({field}) => (
                  <AirportSearchInput
                    label={t("destinationLabel")}
                    placeholder={t("destinationPlaceholder")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FormFieldError
                id="flight-destination-error"
                message={errors.destination?.message}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px_auto] xl:items-end">
            <div>
              <Controller
                name="departureDate"
                control={control}
                render={({field}) => (
                  <FlightDatePicker
                    label={t("departureDateLabel")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FormFieldError
                id="flight-departure-date-error"
                message={errors.departureDate?.message}
              />
            </div>

            <div>
              <Controller
                name="returnDate"
                control={control}
                render={({field}) => (
                  <FlightDatePicker
                    disabled={tripType !== "round_trip"}
                    label={t("returnDateLabel")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FormFieldError
                id="flight-return-date-error"
                message={errors.returnDate?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight-cabin-class">{t("cabinClassLabel")}</Label>
              <select
                id="flight-cabin-class"
                className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register("cabinClass")}
              >
                {CABIN_CLASSES.map((cabinClass) => (
                  <option key={cabinClass} value={cabinClass}>
                    {t(`cabinOptions.${cabinClass}`)}
                  </option>
                ))}
              </select>
            </div>

            <Controller
              name="passengers"
              control={control}
              render={({field}) => (
                <div className="space-y-2">
                  <Label>Passengers</Label>

                  <div className="flex h-11 items-center justify-between rounded-lg border border-border/80 bg-background px-2 shadow-sm">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      disabled={field.value <= 1}
                      onClick={() => handlePassengerChange(field.value - 1)}
                    >
                      <Minus aria-hidden="true" className="h-4 w-4" />
                    </button>

                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{field.value}</p>
                    </div>

                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      disabled={field.value >= 9}
                      onClick={() => handlePassengerChange(field.value + 1)}
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="px-1 text-xs text-muted-foreground">
                    {getPassengerLabel(passengers)}
                  </p>
                  <FormFieldError
                    id="flight-passengers-error"
                    message={errors.passengers?.message}
                  />
                </div>
              )}
            />

            <div className="flex items-end">
              <Button
                type="submit"
                className="h-11 w-full rounded-lg px-6 uppercase tracking-[0.18em] xl:w-auto"
                disabled={isSubmitting}
              >
                <Search aria-hidden="true" className="h-4 w-4" />
                {submitLabel ?? t("submit")}
              </Button>
            </div>
          </div>

          {tripType === "multi_city" ? (
            <div className="space-y-4 rounded-lg border border-border/80 bg-card/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Additional segments</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Segment 1 uses the origin, destination, and departure date above.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={addMultiCitySegment}
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add segment
                </Button>
              </div>

              <div className="space-y-4">
                {multiCitySegments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className="grid gap-4 rounded-lg border border-border/70 bg-background/70 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto] xl:items-end"
                  >
                    <AirportSearchInput
                      label={`Segment ${index + 2} origin`}
                      placeholder="City or airport code"
                      value={segment.origin}
                      onChange={(origin) => updateMultiCitySegment(segment.id, {origin})}
                    />
                    <AirportSearchInput
                      label={`Segment ${index + 2} destination`}
                      placeholder="City or airport code"
                      value={segment.destination}
                      onChange={(destination) =>
                        updateMultiCitySegment(segment.id, {destination})
                      }
                    />
                    <FlightDatePicker
                      label={`Segment ${index + 2} date`}
                      value={segment.departureDate}
                      onChange={(departureDate) =>
                        updateMultiCitySegment(segment.id, {departureDate})
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      disabled={multiCitySegments.length <= 1}
                      onClick={() => removeMultiCitySegment(segment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {multiCityError ? (
                <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {multiCityError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Popular routes
            </p>

            <div className="flex flex-wrap gap-2">
              {INTERNATIONAL_ROUTE_OPTIONS.map((route) => (
                <button
                  key={`${route.origin}-${route.destination}`}
                  type="button"
                  className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  onClick={() => handleQuickRouteSelect(route.origin, route.destination)}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}
