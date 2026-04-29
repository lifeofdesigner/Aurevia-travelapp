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
import {Textarea} from "@/components/ui/textarea";

import {createTravelerProfileSchema} from "../lib/schemas";
import {
  TRAVELER_DOCUMENT_TYPES,
  type CountryOption,
  type TravelerProfileFormValues,
  type TravelerProfileRecord
} from "../types";

type TravelerProfileFormProps = {
  countries: CountryOption[];
  initialValues?: TravelerProfileRecord;
  onCancel?: () => void;
  onSuccess?: () => void;
  travelerId?: string;
};

function buildDefaultValues(
  initialValues?: TravelerProfileRecord
): TravelerProfileFormValues {
  return {
    dateOfBirth: initialValues?.dateOfBirth ?? "",
    documentNumberLast4: initialValues?.primaryDocument?.documentNumberLast4 ?? "",
    documentType: initialValues?.primaryDocument?.documentType ?? "",
    email: initialValues?.email ?? "",
    expiresAt: initialValues?.primaryDocument?.expiresAt ?? "",
    firstName: initialValues?.firstName ?? "",
    gender: initialValues?.gender ?? "",
    isPrimary: initialValues?.isPrimary ?? false,
    issuedAt: initialValues?.primaryDocument?.issuedAt ?? "",
    issuingCountryCode: initialValues?.primaryDocument?.issuingCountryCode ?? "",
    lastName: initialValues?.lastName ?? "",
    middleName: initialValues?.middleName ?? "",
    nationalityCountryCode: initialValues?.nationalityCountryCode ?? "",
    phone: initialValues?.phone ?? "",
    relationshipLabel: initialValues?.relationshipLabel ?? "",
    residenceCountryCode: initialValues?.residenceCountryCode ?? "",
    specialAssistanceNotes: initialValues?.specialAssistanceNotes ?? "",
    travelerType: initialValues?.travelerType ?? "adult"
  };
}

export function TravelerProfileForm({
  countries,
  initialValues,
  onCancel,
  onSuccess,
  travelerId
}: TravelerProfileFormProps) {
  const t = useTranslations("Dashboard.travelers");
  const router = useRouter();
  const schema = useMemo(
    () =>
      createTravelerProfileSchema({
        documentLast4Invalid: t("validation.documentLast4Invalid"),
        documentTypeRequired: t("validation.documentTypeRequired"),
        emailInvalid: t("validation.emailInvalid"),
        expiresAfterIssued: t("validation.expiresAfterIssued"),
        firstNameRequired: t("validation.firstNameRequired"),
        firstNameTooLong: t("validation.firstNameTooLong"),
        lastNameRequired: t("validation.lastNameRequired"),
        lastNameTooLong: t("validation.lastNameTooLong"),
        notesTooLong: t("validation.notesTooLong"),
        phoneInvalid: t("validation.phoneInvalid")
      }),
    [t]
  );
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<TravelerProfileFormValues>({
    defaultValues: buildDefaultValues(initialValues),
    resolver: zodResolver(schema)
  });
  const isEditing = Boolean(travelerId);

  async function onSubmit(values: TravelerProfileFormValues) {
    const response = await fetch(
      travelerId ? `/api/account/travelers/${travelerId}` : "/api/account/travelers",
      {
        body: JSON.stringify(values),
        headers: {
          "content-type": "application/json"
        },
        method: travelerId ? "PATCH" : "POST"
      }
    );
    const result = (await response.json()) as {message?: string};

    if (!response.ok) {
      toast.error(t("saveErrorTitle"), {
        description: result.message ?? t("saveErrorDescription")
      });
      return;
    }

    toast.success(t("saveSuccessTitle"), {
      description: isEditing ? t("updatedDescription") : t("createdDescription")
    });
    router.refresh();
    onSuccess?.();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`traveler-relationship-${travelerId ?? "new"}`}>
            {t("relationshipLabel")}
          </Label>
          <Input
            id={`traveler-relationship-${travelerId ?? "new"}`}
            placeholder={t("relationshipPlaceholder")}
            {...register("relationshipLabel")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-type-${travelerId ?? "new"}`}>{t("typeLabel")}</Label>
          <Select id={`traveler-type-${travelerId ?? "new"}`} {...register("travelerType")}>
            <option value="adult">{t("travelerTypeOptions.adult")}</option>
            <option value="child">{t("travelerTypeOptions.child")}</option>
            <option value="infant">{t("travelerTypeOptions.infant")}</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-first-name-${travelerId ?? "new"}`}>
            {t("firstNameLabel")}
          </Label>
          <Input
            id={`traveler-first-name-${travelerId ?? "new"}`}
            aria-invalid={errors.firstName ? "true" : "false"}
            aria-describedby={
              errors.firstName ? `traveler-first-name-error-${travelerId ?? "new"}` : undefined
            }
            {...register("firstName")}
          />
          <FormFieldError
            id={`traveler-first-name-error-${travelerId ?? "new"}`}
            message={errors.firstName?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-last-name-${travelerId ?? "new"}`}>
            {t("lastNameLabel")}
          </Label>
          <Input
            id={`traveler-last-name-${travelerId ?? "new"}`}
            aria-invalid={errors.lastName ? "true" : "false"}
            aria-describedby={
              errors.lastName ? `traveler-last-name-error-${travelerId ?? "new"}` : undefined
            }
            {...register("lastName")}
          />
          <FormFieldError
            id={`traveler-last-name-error-${travelerId ?? "new"}`}
            message={errors.lastName?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-middle-name-${travelerId ?? "new"}`}>
            {t("middleNameLabel")}
          </Label>
          <Input id={`traveler-middle-name-${travelerId ?? "new"}`} {...register("middleName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-date-of-birth-${travelerId ?? "new"}`}>
            {t("dateOfBirthLabel")}
          </Label>
          <Input
            id={`traveler-date-of-birth-${travelerId ?? "new"}`}
            type="date"
            {...register("dateOfBirth")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-gender-${travelerId ?? "new"}`}>{t("genderLabel")}</Label>
          <Input id={`traveler-gender-${travelerId ?? "new"}`} {...register("gender")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-email-${travelerId ?? "new"}`}>{t("emailLabel")}</Label>
          <Input
            id={`traveler-email-${travelerId ?? "new"}`}
            type="email"
            {...register("email")}
          />
          <FormFieldError
            id={`traveler-email-error-${travelerId ?? "new"}`}
            message={errors.email?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-phone-${travelerId ?? "new"}`}>{t("phoneLabel")}</Label>
          <Input
            id={`traveler-phone-${travelerId ?? "new"}`}
            placeholder={t("phonePlaceholder")}
            {...register("phone")}
          />
          <FormFieldError
            id={`traveler-phone-error-${travelerId ?? "new"}`}
            message={errors.phone?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-nationality-${travelerId ?? "new"}`}>
            {t("nationalityLabel")}
          </Label>
          <Select
            id={`traveler-nationality-${travelerId ?? "new"}`}
            {...register("nationalityCountryCode")}
          >
            <option value="">{t("chooseCountry")}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`traveler-residence-${travelerId ?? "new"}`}>
            {t("residenceCountryLabel")}
          </Label>
          <Select
            id={`traveler-residence-${travelerId ?? "new"}`}
            {...register("residenceCountryCode")}
          >
            <option value="">{t("chooseCountry")}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border/70 bg-background/70 p-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{t("documentTitle")}</h3>
          <p className="text-sm leading-7 text-muted-foreground">{t("documentBody")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`traveler-document-type-${travelerId ?? "new"}`}>
              {t("documentTypeLabel")}
            </Label>
            <Select
              id={`traveler-document-type-${travelerId ?? "new"}`}
              {...register("documentType")}
            >
              <option value="">{t("documentTypePlaceholder")}</option>
              {TRAVELER_DOCUMENT_TYPES.map((documentType) => (
                <option key={documentType} value={documentType}>
                  {t(`documentTypeOptions.${documentType}`)}
                </option>
              ))}
            </Select>
            <FormFieldError
              id={`traveler-document-type-error-${travelerId ?? "new"}`}
              message={errors.documentType?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`traveler-document-country-${travelerId ?? "new"}`}>
              {t("issuingCountryLabel")}
            </Label>
            <Select
              id={`traveler-document-country-${travelerId ?? "new"}`}
              {...register("issuingCountryCode")}
            >
              <option value="">{t("chooseCountry")}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`traveler-document-last4-${travelerId ?? "new"}`}>
              {t("documentLast4Label")}
            </Label>
            <Input
              id={`traveler-document-last4-${travelerId ?? "new"}`}
              maxLength={4}
              {...register("documentNumberLast4")}
            />
            <FormFieldError
              id={`traveler-document-last4-error-${travelerId ?? "new"}`}
              message={errors.documentNumberLast4?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`traveler-document-issued-${travelerId ?? "new"}`}>
              {t("issuedAtLabel")}
            </Label>
            <Input
              id={`traveler-document-issued-${travelerId ?? "new"}`}
              type="date"
              {...register("issuedAt")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`traveler-document-expires-${travelerId ?? "new"}`}>
              {t("expiresAtLabel")}
            </Label>
            <Input
              id={`traveler-document-expires-${travelerId ?? "new"}`}
              type="date"
              {...register("expiresAt")}
            />
            <FormFieldError
              id={`traveler-document-expires-error-${travelerId ?? "new"}`}
              message={errors.expiresAt?.message}
            />
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <Label htmlFor={`traveler-notes-${travelerId ?? "new"}`}>
          {t("specialAssistanceNotesLabel")}
        </Label>
        <Textarea
          id={`traveler-notes-${travelerId ?? "new"}`}
          rows={4}
          {...register("specialAssistanceNotes")}
        />
        <FormFieldError
          id={`traveler-notes-error-${travelerId ?? "new"}`}
          message={errors.specialAssistanceNotes?.message}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("isPrimary")}
        />
        <span className="space-y-1">
          <span className="block font-medium text-foreground">{t("primaryTravelerLabel")}</span>
          <span className="block text-sm leading-7 text-muted-foreground">
            {t("primaryTravelerHint")}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="rounded-lg px-5" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : isEditing ? t("saveEditAction") : t("saveCreateAction")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="rounded-lg px-5" onClick={onCancel}>
            {t("cancelAction")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
