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
import {MOBILITY_CITY_OPTIONS} from "@/lib/mobility-options";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

import {createTourSearchSchema, getTourSearchDefaults} from "../lib/schemas";
import {
  TOUR_CATEGORIES,
  TOUR_DURATION_OPTIONS,
  type TourSearchCriteria,
  type TourSearchFormValues
} from "../types";

type TourSearchFormProps = {
  defaultValues?: Partial<TourSearchCriteria>;
  locale: Locale;
  submitLabel?: string;
};

const searchDestinationOptions = MOBILITY_CITY_OPTIONS.filter((option) =>
  ["vienna", "dubai", "london"].includes(option.slug)
);

export function TourSearchForm({
  defaultValues,
  locale,
  submitLabel
}: TourSearchFormProps) {
  const t = useTranslations("Tours.searchForm");
  const router = useRouter();
  const {searchCurrency} = useCurrency();
  const schema = createTourSearchSchema({
    dateRequired: t("validation.dateRequired"),
    destinationMinimum: t("validation.destinationMinimum")
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<TourSearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getTourSearchDefaults(defaultValues)
  });

  function onSubmit(values: TourSearchFormValues) {
    const params = new URLSearchParams({
      currency: searchCurrency,
      destination: values.destination,
      locale,
      serviceDate: values.serviceDate
    });

    if (values.category) {
      params.set("category", values.category);
    }

    if (values.duration) {
      params.set("duration", values.duration);
    }

    router.push(`${getLocalizedPath(ROUTES.tours, locale)}?${params.toString()}`);
  }

  return (
    <form className="grid gap-4 xl:grid-cols-12" onSubmit={handleSubmit(onSubmit)} noValidate>
      <datalist id="tour-destination-options">
        {searchDestinationOptions.map((option) => (
          <option key={option.slug} value={option.defaultLabel}>
            {option.cityName}, {option.countryName}
          </option>
        ))}
      </datalist>

      <div className="space-y-2 xl:col-span-4">
        <Label htmlFor="tour-destination">{t("tours.destinationLabel")}</Label>
        <Input
          id="tour-destination"
          list="tour-destination-options"
          placeholder={t("tours.destinationPlaceholder")}
          aria-invalid={errors.destination ? "true" : "false"}
          aria-describedby={errors.destination ? "tour-destination-error" : undefined}
          {...register("destination")}
        />
        <FormFieldError id="tour-destination-error" message={errors.destination?.message} />
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="tour-date">{t("tours.serviceDateLabel")}</Label>
        <Input
          id="tour-date"
          type="date"
          aria-invalid={errors.serviceDate ? "true" : "false"}
          aria-describedby={errors.serviceDate ? "tour-date-error" : undefined}
          {...register("serviceDate")}
        />
        <FormFieldError id="tour-date-error" message={errors.serviceDate?.message} />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="tour-category">{t("categoryLabel")}</Label>
        <select
          id="tour-category"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("category", {
            setValueAs: (value) =>
              typeof value === "string" && value.length > 0 ? value : undefined
          })}
        >
          <option value="">{t("categoryOptions.any")}</option>
          {TOUR_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categoryOptions.${category}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="tour-duration">{t("durationLabel")}</Label>
        <select
          id="tour-duration"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("duration", {
            setValueAs: (value) =>
              typeof value === "string" && value.length > 0 ? value : undefined
          })}
        >
          <option value="">{t("durationOptions.any")}</option>
          {TOUR_DURATION_OPTIONS.map((duration) => (
            <option key={duration} value={duration}>
              {t(`durationOptions.${duration}`)}
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
