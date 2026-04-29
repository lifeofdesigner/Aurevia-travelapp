"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useForm} from "react-hook-form";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useCurrency} from "@/lib/currency/use-currency";
import {type Locale} from "@/lib/i18n/routing";
import {MOBILITY_LOCATION_OPTIONS} from "@/lib/mobility-options";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

import {createCarSearchSchema, getCarSearchDefaults} from "../lib/schemas";
import {CAR_CATEGORIES, type CarSearchCriteria, type CarSearchFormValues} from "../types";

type CarSearchFormProps = {
  defaultValues?: Partial<CarSearchCriteria>;
  locale: Locale;
  submitLabel?: string;
};

export function CarSearchForm({
  defaultValues,
  locale,
  submitLabel
}: CarSearchFormProps) {
  const t = useTranslations("Cars.searchForm");
  const router = useRouter();
  const {searchCurrency} = useCurrency();
  const schema = createCarSearchSchema({
    ageRange: t("validation.ageRange"),
    dateRequired: t("validation.dateRequired"),
    dropoffAfterPickup: t("validation.dropoffAfterPickup"),
    locationMinimum: t("validation.locationMinimum"),
    timeRequired: t("validation.timeRequired")
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<CarSearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getCarSearchDefaults(defaultValues)
  });

  function onSubmit(values: CarSearchFormValues) {
    const params = new URLSearchParams({
      currency: searchCurrency,
      driverAge: String(values.driverAge),
      dropoffDate: values.dropoffDate,
      dropoffLocation: values.dropoffLocation,
      dropoffTime: values.dropoffTime,
      locale,
      pickupDate: values.pickupDate,
      pickupLocation: values.pickupLocation,
      pickupTime: values.pickupTime
    });

    if (values.preferredCategory) {
      params.set("preferredCategory", values.preferredCategory);
    }

    router.push(`${getLocalizedPath(ROUTES.cars, locale)}?${params.toString()}`);
  }

  return (
    <form className="grid gap-4 xl:grid-cols-12" onSubmit={handleSubmit(onSubmit)} noValidate>
      <datalist id="car-location-options">
        {MOBILITY_LOCATION_OPTIONS.map((option) => (
          <option key={option.slug} value={option.defaultLabel}>
            {option.cityName}, {option.countryName}
          </option>
        ))}
      </datalist>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="car-pickup-location">{t("pickupLocationLabel")}</Label>
        <Input
          id="car-pickup-location"
          list="car-location-options"
          placeholder={t("pickupLocationPlaceholder")}
          aria-invalid={errors.pickupLocation ? "true" : "false"}
          aria-describedby={
            errors.pickupLocation ? "car-pickup-location-error" : undefined
          }
          {...register("pickupLocation")}
        />
        <FormFieldError
          id="car-pickup-location-error"
          message={errors.pickupLocation?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="car-dropoff-location">{t("dropoffLocationLabel")}</Label>
        <Input
          id="car-dropoff-location"
          list="car-location-options"
          placeholder={t("dropoffLocationPlaceholder")}
          aria-invalid={errors.dropoffLocation ? "true" : "false"}
          aria-describedby={
            errors.dropoffLocation ? "car-dropoff-location-error" : undefined
          }
          {...register("dropoffLocation")}
        />
        <FormFieldError
          id="car-dropoff-location-error"
          message={errors.dropoffLocation?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="car-pickup-date">{t("pickupDateLabel")}</Label>
        <Input
          id="car-pickup-date"
          type="date"
          aria-invalid={errors.pickupDate ? "true" : "false"}
          aria-describedby={errors.pickupDate ? "car-pickup-date-error" : undefined}
          {...register("pickupDate")}
        />
        <FormFieldError id="car-pickup-date-error" message={errors.pickupDate?.message} />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="car-pickup-time">{t("pickupTimeLabel")}</Label>
        <Input
          id="car-pickup-time"
          type="time"
          aria-invalid={errors.pickupTime ? "true" : "false"}
          aria-describedby={errors.pickupTime ? "car-pickup-time-error" : undefined}
          {...register("pickupTime")}
        />
        <FormFieldError id="car-pickup-time-error" message={errors.pickupTime?.message} />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="car-dropoff-date">{t("dropoffDateLabel")}</Label>
        <Input
          id="car-dropoff-date"
          type="date"
          aria-invalid={errors.dropoffDate ? "true" : "false"}
          aria-describedby={errors.dropoffDate ? "car-dropoff-date-error" : undefined}
          {...register("dropoffDate")}
        />
        <FormFieldError
          id="car-dropoff-date-error"
          message={errors.dropoffDate?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="car-dropoff-time">{t("dropoffTimeLabel")}</Label>
        <Input
          id="car-dropoff-time"
          type="time"
          aria-invalid={errors.dropoffTime ? "true" : "false"}
          aria-describedby={errors.dropoffTime ? "car-dropoff-time-error" : undefined}
          {...register("dropoffTime")}
        />
        <FormFieldError
          id="car-dropoff-time-error"
          message={errors.dropoffTime?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-1">
        <Label htmlFor="car-driver-age">{t("driverAgeLabel")}</Label>
        <Input
          id="car-driver-age"
          type="number"
          min={21}
          max={80}
          aria-invalid={errors.driverAge ? "true" : "false"}
          aria-describedby={errors.driverAge ? "car-driver-age-error" : undefined}
          {...register("driverAge", {valueAsNumber: true})}
        />
        <FormFieldError id="car-driver-age-error" message={errors.driverAge?.message} />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="car-preferred-category">{t("preferredCategoryLabel")}</Label>
        <select
          id="car-preferred-category"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("preferredCategory", {
            setValueAs: (value) =>
              typeof value === "string" && value.length > 0 ? value : undefined
          })}
        >
          <option value="">{t("categoryOptions.any")}</option>
          {CAR_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categoryOptions.${category}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end xl:col-span-12 xl:justify-end">
        <Button type="submit" className="h-11 rounded-lg px-6" disabled={isSubmitting}>
          {submitLabel ?? t("submit")}
        </Button>
      </div>
    </form>
  );
}
