"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useEffect} from "react";
import {useForm} from "react-hook-form";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useCurrency} from "@/lib/currency/use-currency";
import {type Locale} from "@/lib/i18n/routing";
import {
  getDefaultCityLabelForAirport,
  getMobilityAirportOption,
  MOBILITY_AIRPORT_OPTIONS,
  MOBILITY_LOCATION_OPTIONS
} from "@/lib/mobility-options";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

import {createTransferSearchSchema, getTransferSearchDefaults} from "../lib/schemas";
import {
  TRANSFER_ROUTE_MODES,
  TRANSFER_VEHICLE_CLASSES,
  type TransferRouteMode,
  type TransferSearchCriteria,
  type TransferSearchFormValues
} from "../types";

type TransferSearchFormProps = {
  defaultValues?: Partial<TransferSearchCriteria>;
  locale: Locale;
  submitLabel?: string;
};

export function TransferSearchForm({
  defaultValues,
  locale,
  submitLabel
}: TransferSearchFormProps) {
  const t = useTranslations("Transfers.searchForm");
  const router = useRouter();
  const {searchCurrency} = useCurrency();
  const schema = createTransferSearchSchema({
    airportRequired: t("validation.airportRequired"),
    dateRequired: t("validation.dateRequired"),
    flightNumberRequired: t("validation.flightNumberRequired"),
    locationMinimum: t("validation.locationMinimum"),
    luggageRange: t("validation.luggageRange"),
    passengersRange: t("validation.passengersRange"),
    timeRequired: t("validation.timeRequired")
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register,
    setValue,
    watch
  } = useForm<TransferSearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getTransferSearchDefaults(defaultValues)
  });
  const routeMode = watch("routeMode");
  const airportCode = watch("airportCode");
  const pickupLocation = watch("pickupLocation");
  const dropoffLocation = watch("dropoffLocation");
  const selectedAirport = getMobilityAirportOption(airportCode);

  useEffect(() => {
    const defaultCityLabel = getDefaultCityLabelForAirport(airportCode);

    if (!defaultCityLabel) {
      return;
    }

    if (routeMode === "airport_to_hotel" && dropoffLocation.trim().length === 0) {
      setValue("dropoffLocation", defaultCityLabel, {shouldDirty: false});
    }

    if (routeMode === "hotel_to_airport" && pickupLocation.trim().length === 0) {
      setValue("pickupLocation", defaultCityLabel, {shouldDirty: false});
    }
  }, [airportCode, dropoffLocation, pickupLocation, routeMode, setValue]);

  function onSubmit(values: TransferSearchFormValues) {
    const derivedPickupLocation =
      values.routeMode === "airport_to_hotel"
        ? selectedAirport?.defaultLabel ?? values.pickupLocation
        : values.pickupLocation;
    const derivedDropoffLocation =
      values.routeMode === "hotel_to_airport"
        ? selectedAirport?.defaultLabel ?? values.dropoffLocation
        : values.dropoffLocation;
    const params = new URLSearchParams({
      currency: searchCurrency,
      dropoffLocation: derivedDropoffLocation,
      locale,
      luggageCount: String(values.luggageCount),
      passengerCount: String(values.passengerCount),
      pickupDate: values.pickupDate,
      pickupLocation: derivedPickupLocation,
      pickupTime: values.pickupTime,
      routeMode: values.routeMode
    });

    if (values.airportCode && values.routeMode !== "point_to_point") {
      params.set("airportCode", values.airportCode);
    }

    if (values.flightNumber && values.routeMode !== "point_to_point") {
      params.set("flightNumber", values.flightNumber);
    }

    if (values.vehicleClass) {
      params.set("vehicleClass", values.vehicleClass);
    }

    if (values.meetAndGreet) {
      params.set("meetAndGreet", "1");
    }

    router.push(`${getLocalizedPath(ROUTES.transfers, locale)}?${params.toString()}`);
  }

  function getEditableLabels(mode: TransferRouteMode) {
    if (mode === "airport_to_hotel") {
      return {
        dropoffLabel: t("hotelOrAddressLabel"),
        dropoffPlaceholder: t("hotelOrAddressPlaceholder"),
        pickupLabel: t("airportPickupLabel")
      };
    }

    if (mode === "hotel_to_airport") {
      return {
        dropoffLabel: t("airportDropoffLabel"),
        dropoffPlaceholder: t("airportDropoffPlaceholder"),
        pickupLabel: t("hotelOrAddressLabel")
      };
    }

    return {
      dropoffLabel: t("dropoffLocationLabel"),
      dropoffPlaceholder: t("dropoffLocationPlaceholder"),
      pickupLabel: t("pickupLocationLabel")
    };
  }

  const labels = getEditableLabels(routeMode);

  return (
    <form className="grid gap-4 xl:grid-cols-12" onSubmit={handleSubmit(onSubmit)} noValidate>
      <datalist id="transfer-location-options">
        {MOBILITY_LOCATION_OPTIONS.map((option) => (
          <option key={option.slug} value={option.defaultLabel}>
            {option.cityName}, {option.countryName}
          </option>
        ))}
      </datalist>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="transfer-route-mode">{t("routeModeLabel")}</Label>
        <select
          id="transfer-route-mode"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("routeMode")}
        >
          {TRANSFER_ROUTE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`routeModeOptions.${mode}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="transfer-airport-code">{t("airportLabel")}</Label>
        <select
          id="transfer-airport-code"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={routeMode === "point_to_point"}
          aria-invalid={errors.airportCode ? "true" : "false"}
          aria-describedby={errors.airportCode ? "transfer-airport-code-error" : undefined}
          {...register("airportCode", {
            setValueAs: (value) =>
              typeof value === "string" && value.length > 0 ? value : undefined
          })}
        >
          <option value="">{t("airportPlaceholder")}</option>
          {MOBILITY_AIRPORT_OPTIONS.map((airport) => (
            <option key={airport.slug} value={airport.airportCode}>
              {airport.defaultLabel}
            </option>
          ))}
        </select>
        <FormFieldError
          id="transfer-airport-code-error"
          message={errors.airportCode?.message}
        />
      </div>

      {routeMode === "airport_to_hotel" ? (
        <div className="space-y-2 xl:col-span-3">
          <Label htmlFor="transfer-derived-pickup">{labels.pickupLabel}</Label>
          <Input
            id="transfer-derived-pickup"
            value={selectedAirport?.defaultLabel ?? ""}
            placeholder={t("airportDerivedPlaceholder")}
            disabled
          />
        </div>
      ) : (
        <div className="space-y-2 xl:col-span-3">
          <Label htmlFor="transfer-pickup-location">{labels.pickupLabel}</Label>
          <Input
            id="transfer-pickup-location"
            list="transfer-location-options"
            placeholder={t("pickupLocationPlaceholder")}
            aria-invalid={errors.pickupLocation ? "true" : "false"}
            aria-describedby={
              errors.pickupLocation ? "transfer-pickup-location-error" : undefined
            }
            {...register("pickupLocation")}
          />
          <FormFieldError
            id="transfer-pickup-location-error"
            message={errors.pickupLocation?.message}
          />
        </div>
      )}

      {routeMode === "hotel_to_airport" ? (
        <div className="space-y-2 xl:col-span-3">
          <Label htmlFor="transfer-derived-dropoff">{labels.dropoffLabel}</Label>
          <Input
            id="transfer-derived-dropoff"
            value={selectedAirport?.defaultLabel ?? ""}
            placeholder={t("airportDerivedPlaceholder")}
            disabled
          />
        </div>
      ) : (
        <div className="space-y-2 xl:col-span-3">
          <Label htmlFor="transfer-dropoff-location">{labels.dropoffLabel}</Label>
          <Input
            id="transfer-dropoff-location"
            list="transfer-location-options"
            placeholder={labels.dropoffPlaceholder}
            aria-invalid={errors.dropoffLocation ? "true" : "false"}
            aria-describedby={
              errors.dropoffLocation ? "transfer-dropoff-location-error" : undefined
            }
            {...register("dropoffLocation")}
          />
          <FormFieldError
            id="transfer-dropoff-location-error"
            message={errors.dropoffLocation?.message}
          />
        </div>
      )}

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="transfer-pickup-date">{t("pickupDateLabel")}</Label>
        <Input
          id="transfer-pickup-date"
          type="date"
          aria-invalid={errors.pickupDate ? "true" : "false"}
          aria-describedby={errors.pickupDate ? "transfer-pickup-date-error" : undefined}
          {...register("pickupDate")}
        />
        <FormFieldError
          id="transfer-pickup-date-error"
          message={errors.pickupDate?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="transfer-pickup-time">{t("pickupTimeLabel")}</Label>
        <Input
          id="transfer-pickup-time"
          type="time"
          aria-invalid={errors.pickupTime ? "true" : "false"}
          aria-describedby={errors.pickupTime ? "transfer-pickup-time-error" : undefined}
          {...register("pickupTime")}
        />
        <FormFieldError
          id="transfer-pickup-time-error"
          message={errors.pickupTime?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="transfer-passenger-count">{t("passengerCountLabel")}</Label>
        <Input
          id="transfer-passenger-count"
          type="number"
          min={1}
          max={12}
          aria-invalid={errors.passengerCount ? "true" : "false"}
          aria-describedby={
            errors.passengerCount ? "transfer-passenger-count-error" : undefined
          }
          {...register("passengerCount", {valueAsNumber: true})}
        />
        <FormFieldError
          id="transfer-passenger-count-error"
          message={errors.passengerCount?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="transfer-luggage-count">{t("luggageCountLabel")}</Label>
        <Input
          id="transfer-luggage-count"
          type="number"
          min={0}
          max={12}
          aria-invalid={errors.luggageCount ? "true" : "false"}
          aria-describedby={
            errors.luggageCount ? "transfer-luggage-count-error" : undefined
          }
          {...register("luggageCount", {valueAsNumber: true})}
        />
        <FormFieldError
          id="transfer-luggage-count-error"
          message={errors.luggageCount?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="transfer-vehicle-class">{t("vehicleClassLabel")}</Label>
        <select
          id="transfer-vehicle-class"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("vehicleClass", {
            setValueAs: (value) =>
              typeof value === "string" && value.length > 0 ? value : undefined
          })}
        >
          <option value="">{t("vehicleClassOptions.any")}</option>
          {TRANSFER_VEHICLE_CLASSES.map((vehicleClass) => (
            <option key={vehicleClass} value={vehicleClass}>
              {t(`vehicleClassOptions.${vehicleClass}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="transfer-flight-number">{t("flightNumberLabel")}</Label>
        <Input
          id="transfer-flight-number"
          placeholder={t("flightNumberPlaceholder")}
          disabled={routeMode === "point_to_point"}
          aria-invalid={errors.flightNumber ? "true" : "false"}
          aria-describedby={errors.flightNumber ? "transfer-flight-number-error" : undefined}
          {...register("flightNumber")}
        />
        <FormFieldError
          id="transfer-flight-number-error"
          message={errors.flightNumber?.message}
        />
      </div>

      <div className="flex items-center gap-3 xl:col-span-3 xl:pt-8">
        <input
          id="transfer-meet-and-greet"
          type="checkbox"
          className="h-4 w-4 rounded border-border"
          {...register("meetAndGreet")}
        />
        <Label htmlFor="transfer-meet-and-greet" className="leading-6">
          {t("meetAndGreetLabel")}
        </Label>
      </div>

      <div className="flex items-end xl:col-span-12 xl:justify-end">
        <Button type="submit" className="h-11 rounded-lg px-6" disabled={isSubmitting}>
          {submitLabel ?? t("submit")}
        </Button>
      </div>
    </form>
  );
}
