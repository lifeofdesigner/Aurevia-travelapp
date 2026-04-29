"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {type Locale} from "@/lib/i18n/routing";
import {SUPPORTED_CURRENCIES} from "@/lib/money";

import {createProfileSettingsSchema} from "../lib/schemas";
import {type CountryOption, type ProfileSettingsFormValues, type ProfileSettingsRecord} from "../types";

type ProfileSettingsFormProps = {
  countries: CountryOption[];
  initialValues: ProfileSettingsRecord;
  locale: Locale;
};

function buildDefaultValues(initialValues: ProfileSettingsRecord): ProfileSettingsFormValues {
  return {
    billingAddressCityName: initialValues.billingAddress?.cityName ?? "",
    billingAddressCompanyName: initialValues.billingAddress?.companyName ?? "",
    billingAddressCountryCode: initialValues.billingAddress?.countryCode ?? "",
    billingAddressLine1: initialValues.billingAddress?.line1 ?? "",
    billingAddressLine2: initialValues.billingAddress?.line2 ?? "",
    billingAddressPostalCode: initialValues.billingAddress?.postalCode ?? "",
    billingAddressRecipientName: initialValues.billingAddress?.recipientName ?? "",
    billingAddressStateRegion: initialValues.billingAddress?.stateRegion ?? "",
    billingAddressVatNumber: initialValues.billingAddress?.vatNumber ?? "",
    dateOfBirth: initialValues.dateOfBirth,
    firstName: initialValues.firstName,
    lastName: initialValues.lastName,
    marketingEmailOptIn: initialValues.marketingEmailOptIn,
    phone: initialValues.phone,
    preferredCurrency: initialValues.preferredCurrency,
    preferredLocale: initialValues.preferredLocale
  };
}

export function ProfileSettingsForm({
  countries,
  initialValues,
  locale
}: ProfileSettingsFormProps) {
  const t = useTranslations("Dashboard.profile");
  const router = useRouter();
  const schema = useMemo(
    () =>
      createProfileSettingsSchema({
        addressCityRequired: t("validation.addressCityRequired"),
        addressCountryRequired: t("validation.addressCountryRequired"),
        addressLineRequired: t("validation.addressLineRequired"),
        dateInvalid: t("validation.dateInvalid"),
        firstNameTooLong: t("validation.firstNameTooLong"),
        lastNameTooLong: t("validation.lastNameTooLong"),
        phoneInvalid: t("validation.phoneInvalid")
      }),
    [t]
  );
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<ProfileSettingsFormValues>({
    defaultValues: buildDefaultValues(initialValues),
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: ProfileSettingsFormValues) {
    const response = await fetch("/api/account/profile", {
      body: JSON.stringify(values),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });
    const result = (await response.json()) as {message?: string};

    if (!response.ok) {
      toast.error(t("saveErrorTitle"), {
        description: result.message ?? t("saveErrorDescription")
      });
      return;
    }

    toast.success(t("saveSuccessTitle"), {
      description: t("saveSuccessDescription")
    });
    router.refresh();
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">{t("personalTitle")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("personalBody")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-first-name">{t("firstNameLabel")}</Label>
            <Input
              id="profile-first-name"
              aria-invalid={errors.firstName ? "true" : "false"}
              aria-describedby={errors.firstName ? "profile-first-name-error" : undefined}
              {...register("firstName")}
            />
            <FormFieldError id="profile-first-name-error" message={errors.firstName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-last-name">{t("lastNameLabel")}</Label>
            <Input
              id="profile-last-name"
              aria-invalid={errors.lastName ? "true" : "false"}
              aria-describedby={errors.lastName ? "profile-last-name-error" : undefined}
              {...register("lastName")}
            />
            <FormFieldError id="profile-last-name-error" message={errors.lastName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-date-of-birth">{t("dateOfBirthLabel")}</Label>
            <Input
              id="profile-date-of-birth"
              type="date"
              aria-invalid={errors.dateOfBirth ? "true" : "false"}
              aria-describedby={errors.dateOfBirth ? "profile-date-of-birth-error" : undefined}
              {...register("dateOfBirth")}
            />
            <FormFieldError
              id="profile-date-of-birth-error"
              message={errors.dateOfBirth?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">{t("emailLabel")}</Label>
            <Input id="profile-email" value={initialValues.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">{t("contactTitle")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("contactBody")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-phone">{t("phoneLabel")}</Label>
            <Input
              id="profile-phone"
              placeholder={t("phonePlaceholder")}
              aria-invalid={errors.phone ? "true" : "false"}
              aria-describedby={errors.phone ? "profile-phone-error" : undefined}
              {...register("phone")}
            />
            <FormFieldError id="profile-phone-error" message={errors.phone?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-recipient">{t("billingRecipientLabel")}</Label>
            <Input id="profile-recipient" {...register("billingAddressRecipientName")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">{t("preferencesTitle")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("preferencesBody")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-locale">{t("preferredLocaleLabel")}</Label>
            <Select id="profile-locale" {...register("preferredLocale")}>
              <option value="en">{t("localeOptions.en")}</option>
              <option value="de">{t("localeOptions.de")}</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-currency">{t("preferredCurrencyLabel")}</Label>
            <Select id="profile-currency" {...register("preferredCurrency")}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("marketingEmailOptIn")}
          />
          <span className="space-y-1">
            <span className="block font-medium text-foreground">{t("marketingLabel")}</span>
            <span className="block text-sm leading-7 text-muted-foreground">
              {t("marketingHint")}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">{t("billingTitle")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("billingBody")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billing-line-1">{t("billingLine1Label")}</Label>
            <Input
              id="billing-line-1"
              aria-invalid={errors.billingAddressLine1 ? "true" : "false"}
              aria-describedby={
                errors.billingAddressLine1 ? "billing-line-1-error" : undefined
              }
              {...register("billingAddressLine1")}
            />
            <FormFieldError
              id="billing-line-1-error"
              message={errors.billingAddressLine1?.message}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billing-line-2">{t("billingLine2Label")}</Label>
            <Input id="billing-line-2" {...register("billingAddressLine2")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-city">{t("billingCityLabel")}</Label>
            <Input
              id="billing-city"
              aria-invalid={errors.billingAddressCityName ? "true" : "false"}
              aria-describedby={
                errors.billingAddressCityName ? "billing-city-error" : undefined
              }
              {...register("billingAddressCityName")}
            />
            <FormFieldError
              id="billing-city-error"
              message={errors.billingAddressCityName?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-country">{t("billingCountryLabel")}</Label>
            <Select
              id="billing-country"
              aria-invalid={errors.billingAddressCountryCode ? "true" : "false"}
              aria-describedby={
                errors.billingAddressCountryCode ? "billing-country-error" : undefined
              }
              {...register("billingAddressCountryCode")}
            >
              <option value="">{t("chooseCountry")}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
            <FormFieldError
              id="billing-country-error"
              message={errors.billingAddressCountryCode?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-state">{t("billingStateLabel")}</Label>
            <Input id="billing-state" {...register("billingAddressStateRegion")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-postal">{t("billingPostalCodeLabel")}</Label>
            <Input id="billing-postal" {...register("billingAddressPostalCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-company">{t("billingCompanyLabel")}</Label>
            <Input id="billing-company" {...register("billingAddressCompanyName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-vat">{t("billingVatLabel")}</Label>
            <Input id="billing-vat" {...register("billingAddressVatNumber")} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="rounded-lg px-6" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : t("saveAction")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-lg px-6"
          onClick={() => router.push(`/${locale}/auth?next=/${locale}/dashboard/profile`)}
        >
          {t("accountAccessAction")}
        </Button>
      </div>
    </form>
  );
}
