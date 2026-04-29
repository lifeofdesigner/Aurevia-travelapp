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
import {getLocalizedPath, ROUTES} from "@/lib/routes";

import {createHotelSearchSchema, getHotelSearchDefaults} from "../lib/schemas";
import {HOTEL_PROPERTY_TYPES, type HotelSearchCriteria, type HotelSearchFormValues} from "../types";

type HotelSearchFormProps = {
  defaultValues?: Partial<HotelSearchCriteria>;
  locale: Locale;
  submitLabel?: string;
};

export function HotelSearchForm({
  defaultValues,
  locale,
  submitLabel
}: HotelSearchFormProps) {
  const t = useTranslations("Hotels.searchForm");
  const router = useRouter();
  const {searchCurrency} = useCurrency();
  const schema = createHotelSearchSchema({
    checkInRequired: t("validation.checkInRequired"),
    checkOutAfterCheckIn: t("validation.checkOutAfterCheckIn"),
    checkOutRequired: t("validation.checkOutRequired"),
    guestsAtLeastRooms: t("validation.guestsAtLeastRooms"),
    guestsRange: t("validation.guestsRange"),
    minimumTwoCharacters: t("validation.minimumTwoCharacters"),
    roomsRange: t("validation.roomsRange"),
    starRange: t("validation.starRange")
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<HotelSearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getHotelSearchDefaults(defaultValues)
  });

  function onSubmit(values: HotelSearchFormValues) {
    const params = new URLSearchParams({
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      currency: searchCurrency,
      destination: values.destination,
      guests: String(values.guests),
      locale,
      rooms: String(values.rooms)
    });

    if (typeof values.preferredStarRating === "number") {
      params.set("preferredStarRating", String(values.preferredStarRating));
    }

    if (values.propertyType) {
      params.set("propertyType", values.propertyType);
    }

    router.push(`${getLocalizedPath(ROUTES.hotels, locale)}?${params.toString()}`);
  }

  return (
    <form className="grid gap-4 xl:grid-cols-12" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="hotel-destination">{t("destinationLabel")}</Label>
        <Input
          id="hotel-destination"
          placeholder={t("destinationPlaceholder")}
          aria-invalid={errors.destination ? "true" : "false"}
          aria-describedby={errors.destination ? "hotel-destination-error" : undefined}
          {...register("destination")}
        />
        <FormFieldError
          id="hotel-destination-error"
          message={errors.destination?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="hotel-check-in">{t("checkInLabel")}</Label>
        <Input
          id="hotel-check-in"
          type="date"
          aria-invalid={errors.checkIn ? "true" : "false"}
          aria-describedby={errors.checkIn ? "hotel-check-in-error" : undefined}
          {...register("checkIn")}
        />
        <FormFieldError id="hotel-check-in-error" message={errors.checkIn?.message} />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="hotel-check-out">{t("checkOutLabel")}</Label>
        <Input
          id="hotel-check-out"
          type="date"
          aria-invalid={errors.checkOut ? "true" : "false"}
          aria-describedby={errors.checkOut ? "hotel-check-out-error" : undefined}
          {...register("checkOut")}
        />
        <FormFieldError
          id="hotel-check-out-error"
          message={errors.checkOut?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-1">
        <Label htmlFor="hotel-guests">{t("guestsLabel")}</Label>
        <Input
          id="hotel-guests"
          type="number"
          min={1}
          max={12}
          aria-invalid={errors.guests ? "true" : "false"}
          aria-describedby={errors.guests ? "hotel-guests-error" : undefined}
          {...register("guests", {valueAsNumber: true})}
        />
        <FormFieldError id="hotel-guests-error" message={errors.guests?.message} />
      </div>

      <div className="space-y-2 xl:col-span-1">
        <Label htmlFor="hotel-rooms">{t("roomsLabel")}</Label>
        <Input
          id="hotel-rooms"
          type="number"
          min={1}
          max={4}
          aria-invalid={errors.rooms ? "true" : "false"}
          aria-describedby={errors.rooms ? "hotel-rooms-error" : undefined}
          {...register("rooms", {valueAsNumber: true})}
        />
        <FormFieldError id="hotel-rooms-error" message={errors.rooms?.message} />
      </div>

      <div className="space-y-2 xl:col-span-1">
        <Label htmlFor="hotel-star-rating">{t("preferredStarRatingLabel")}</Label>
        <select
          id="hotel-star-rating"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("preferredStarRating", {
            setValueAs: (value) => (typeof value === "string" && value.length > 0 ? Number(value) : undefined)
          })}
        >
          <option value="">{t("preferredStarRatingOptions.any")}</option>
          <option value="5">{t("preferredStarRatingOptions.5")}</option>
          <option value="4">{t("preferredStarRatingOptions.4")}</option>
          <option value="3">{t("preferredStarRatingOptions.3")}</option>
        </select>
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="hotel-property-type">{t("propertyTypeLabel")}</Label>
        <select
          id="hotel-property-type"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("propertyType", {
            setValueAs: (value) => (typeof value === "string" && value.length > 0 ? value : undefined)
          })}
        >
          <option value="">{t("propertyTypeOptions.any")}</option>
          {HOTEL_PROPERTY_TYPES.map((propertyType) => (
            <option key={propertyType} value={propertyType}>
              {t(`propertyTypeOptions.${propertyType}`)}
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
