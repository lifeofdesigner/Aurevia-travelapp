"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useForm} from "react-hook-form";
import {type z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";

import {VISA_COUNTRY_OPTIONS, VISA_SERVICE_PRODUCTS} from "../lib/catalog";
import {
  createVisaCatalogSearchSchema,
  getVisaSearchDefaults
} from "../lib/schemas";
import {getVisaCatalogSearchMessages} from "../lib/validation-messages";
import {type VisaCatalogSearchValues} from "../types";

type VisaSearchFormProps = {
  defaultValues?: Partial<VisaCatalogSearchValues>;
  locale: Locale;
  submitLabel?: string;
};

export function VisaSearchForm({
  defaultValues,
  locale,
  submitLabel
}: VisaSearchFormProps) {
  const t = useTranslations("SearchTabs");
  const router = useRouter();
  const schema = createVisaCatalogSearchSchema(getVisaCatalogSearchMessages(t));
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: getVisaSearchDefaults(defaultValues)
  });

  function onSubmit(values: z.output<typeof schema>) {
    const params = new URLSearchParams({
      destinationCountry: values.destinationCountry,
      nationality: values.nationality,
      travelDate: values.travelDate
    });

    router.push(`${getLocalizedPath(ROUTES.visa, locale)}?${params.toString()}`);
  }

  return (
    <form className="grid gap-4 xl:grid-cols-12" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2 xl:col-span-4">
        <Label htmlFor="visa-nationality">{t("visa.nationalityLabel")}</Label>
        <select
          id="visa-nationality"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-invalid={errors.nationality ? "true" : "false"}
          aria-describedby={errors.nationality ? "visa-nationality-error" : undefined}
          {...register("nationality")}
        >
          <option value="">{t("visa.chooseNationality")}</option>
          {VISA_COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t("visa.nationalityHint")}</p>
        <FormFieldError id="visa-nationality-error" message={errors.nationality?.message} />
      </div>

      <div className="space-y-2 xl:col-span-4">
        <Label htmlFor="visa-destination-country">{t("visa.destinationCountryLabel")}</Label>
        <select
          id="visa-destination-country"
          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-invalid={errors.destinationCountry ? "true" : "false"}
          aria-describedby={
            errors.destinationCountry ? "visa-destination-country-error" : undefined
          }
          {...register("destinationCountry")}
        >
          <option value="">{t("visa.chooseDestinationCountry")}</option>
          {VISA_SERVICE_PRODUCTS.map((product) => {
            const country = VISA_COUNTRY_OPTIONS.find(
              (option) => option.code === product.countryCode
            );

            if (!country) {
              return null;
            }

            return (
              <option key={product.countryCode} value={product.countryCode}>
                {country.name}
              </option>
            );
          })}
        </select>
        <p className="text-xs text-muted-foreground">{t("visa.destinationCountryHint")}</p>
        <FormFieldError
          id="visa-destination-country-error"
          message={errors.destinationCountry?.message}
        />
      </div>

      <div className="space-y-2 xl:col-span-3">
        <Label htmlFor="visa-travel-date">{t("visa.travelDateLabel")}</Label>
        <Input
          id="visa-travel-date"
          type="date"
          aria-invalid={errors.travelDate ? "true" : "false"}
          aria-describedby={errors.travelDate ? "visa-travel-date-error" : undefined}
          {...register("travelDate")}
        />
        <FormFieldError id="visa-travel-date-error" message={errors.travelDate?.message} />
      </div>

      <div className="xl:col-span-1 xl:flex xl:items-end">
        <Button type="submit" className="h-11 w-full rounded-lg px-6" disabled={isSubmitting}>
          {submitLabel ?? t("visa.submit")}
        </Button>
      </div>
    </form>
  );
}
