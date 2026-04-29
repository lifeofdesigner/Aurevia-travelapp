"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {ArrowRight, CircleCheckBig, FileCheck2, Plus, Save, Trash2} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useMemo, useState} from "react";
import {useFieldArray, useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {formatDateTime} from "@/lib/dates";
import {type Locale} from "@/lib/i18n/routing";

import {VISA_COUNTRY_OPTIONS, VISA_REQUIREMENT_DEFINITIONS} from "../lib/catalog";
import {
  formatVisaProcessingTimeline,
  formatVisaServicePrice
} from "../lib/formatters";
import {createVisaApplicationSchema} from "../lib/schemas";
import {
  type VisaApplicationFormValues,
  type VisaApplicationSaveResult,
  type VisaApplicationStatus,
  type VisaApplicationSubmitResult,
  type VisaServiceProduct,
  type VisaUploadedDocument,
  VISA_PURPOSES,
  VISA_RESIDENCY_STATUSES
} from "../types";
import {VisaDocumentUploadField} from "./visa-document-upload-field";
import {VisaStatusTracker} from "./visa-status-tracker";

type VisaApplicationFormSchemaInput = z.input<ReturnType<typeof createVisaApplicationSchema>>;
type VisaApplicationFormSchemaOutput = z.output<ReturnType<typeof createVisaApplicationSchema>>;

type VisaApplicationWizardProps = {
  applicationId: string;
  defaultApplicantEmail: string;
  initialStatus: VisaApplicationStatus;
  initialReviewedAt?: string | null;
  initialSubmittedAt?: string | null;
  initialUploads: VisaUploadedDocument[];
  initialValues: VisaApplicationFormValues;
  lastSavedAt: string;
  locale: Locale;
  product: VisaServiceProduct;
};

type VisaApplicationRoutePayload = {
  action: "save_draft" | "submit";
  formData: VisaApplicationFormValues;
  locale: Locale;
};

const steps = ["travel", "identity", "residency", "documents", "review"] as const;

async function mutateVisaApplication(
  applicationId: string,
  payload: VisaApplicationRoutePayload
) {
  const response = await fetch(`/api/visa/applications/${applicationId}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json"
    },
    method: "PATCH"
  });
  const body = (await response.json()) as
    | {message?: string}
    | VisaApplicationSaveResult
    | VisaApplicationSubmitResult;

  if (!response.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : "Unable to update the visa application."
    );
  }

  return body as VisaApplicationSaveResult | VisaApplicationSubmitResult;
}

function toVisaApplicationFormValues(
  formData: VisaApplicationFormSchemaOutput
): VisaApplicationFormValues {
  return {
    ...formData,
    acknowledgeInformationAccuracy: true,
    acknowledgeServiceScope: true
  };
}

function getCountryLabel(code: string) {
  const option = VISA_COUNTRY_OPTIONS.find((country) => country.code === code.toUpperCase());

  return option?.name ?? code;
}

export function VisaApplicationWizard({
  applicationId,
  defaultApplicantEmail,
  initialStatus,
  initialReviewedAt,
  initialSubmittedAt,
  initialUploads,
  initialValues,
  lastSavedAt,
  locale,
  product
}: VisaApplicationWizardProps) {
  const t = useTranslations("Visa.application");
  const sharedT = useTranslations("Visa.shared");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAt, setSavedAt] = useState(lastSavedAt);
  const [status, setStatus] = useState<VisaApplicationStatus>(initialStatus);
  const [uploadedDocuments, setUploadedDocuments] = useState(initialUploads);
  const schema = createVisaApplicationSchema({
    acknowledgementsRequired: t("validation.acknowledgementsRequired"),
    companionDateRequired: t("validation.companionDateRequired"),
    companionNameRequired: t("validation.companionNameRequired"),
    companionRelationshipRequired: t("validation.companionRelationshipRequired"),
    dateOfBirthRequired: t("validation.dateOfBirthRequired"),
    departureAfterArrival: t("validation.departureAfterArrival"),
    destinationRequired: t("validation.destinationRequired"),
    emailInvalid: t("validation.emailInvalid"),
    emailRequired: t("validation.emailRequired"),
    firstNameRequired: t("validation.firstNameRequired"),
    lastNameRequired: t("validation.lastNameRequired"),
    nationalityRequired: t("validation.nationalityRequired"),
    passportCountryRequired: t("validation.passportCountryRequired"),
    passportExpiryAfterDeparture: t("validation.passportExpiryAfterDeparture"),
    passportExpiryRequired: t("validation.passportExpiryRequired"),
    passportIssuedBeforeExpiry: t("validation.passportIssuedBeforeExpiry"),
    passportIssuedRequired: t("validation.passportIssuedRequired"),
    passportNumberRequired: t("validation.passportNumberRequired"),
    phoneInvalid: t("validation.phoneInvalid"),
    purposeRequired: t("validation.purposeRequired"),
    residencyAddressRequired: t("validation.residencyAddressRequired"),
    residencyCityRequired: t("validation.residencyCityRequired"),
    residencyCountryRequired: t("validation.residencyCountryRequired"),
    residencyStatusRequired: t("validation.residencyStatusRequired"),
    tooManyCompanions: t("validation.tooManyCompanions"),
    travelDateRequired: t("validation.travelDateRequired")
  });
  const {
    control,
    formState: {errors},
    getValues,
    handleSubmit,
    register,
    trigger,
    watch
  } = useForm<VisaApplicationFormSchemaInput, unknown, VisaApplicationFormSchemaOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...initialValues,
      email: initialValues.email || defaultApplicantEmail
    }
  });
  const companionsFieldArray = useFieldArray({
    control,
    name: "companions"
  });
  const values = watch();
  const uploadsByType = useMemo(() => {
    const nextMap = new Map<string, VisaUploadedDocument[]>();

    for (const upload of uploadedDocuments) {
      const currentUploads = nextMap.get(upload.documentType) ?? [];
      currentUploads.push(upload);
      nextMap.set(upload.documentType, currentUploads);
    }

    return nextMap;
  }, [uploadedDocuments]);
  const requiredDocumentCodes = product.requirementCodes;
  const missingRequiredDocuments = requiredDocumentCodes.filter(
    (documentType) => (uploadsByType.get(documentType)?.length ?? 0) === 0
  );
  const saveMutation = useMutation({
    mutationFn: (formData: VisaApplicationFormSchemaOutput) =>
      mutateVisaApplication(applicationId, {
        action: "save_draft",
        formData: toVisaApplicationFormValues(formData),
        locale
      }),
    onError: (error) => {
      toast.error(t("draftErrorTitle"), {
        description: error.message
      });
    },
    onSuccess: (result) => {
      setSavedAt(result.savedAt);
      setStatus(result.status);
      toast.success(t("draftSavedTitle"), {
        description: t("draftSavedDescription")
      });
    }
  });
  const submitMutation = useMutation({
    mutationFn: (formData: VisaApplicationFormSchemaOutput) =>
      mutateVisaApplication(applicationId, {
        action: "submit",
        formData: toVisaApplicationFormValues(formData),
        locale
      }) as Promise<VisaApplicationSubmitResult>,
    onError: (error) => {
      toast.error(t("submitErrorTitle"), {
        description: error.message
      });
    },
    onSuccess: (result) => {
      toast.success(t("submitSuccessTitle"), {
        description: t("submitSuccessDescription", {
          reference: result.applicationReference
        })
      });
      router.push(`/${locale}/dashboard/visa/${result.applicationId}`);
    }
  });

  async function handleContinue() {
    if (steps[stepIndex] === "travel") {
      const valid = await trigger([
        "destinationCountryCode",
        "nationalityCountryCode",
        "intendedArrivalDate",
        "intendedDepartureDate",
        "purposeOfTravel",
        "purposeOfTravelDetails"
      ]);

      if (valid) {
        setStepIndex(1);
      }

      return;
    }

    if (steps[stepIndex] === "identity") {
      const valid = await trigger([
        "firstName",
        "lastName",
        "dateOfBirth",
        "email",
        "phone",
        "passportNumber",
        "passportCountryCode",
        "passportIssuedOn",
        "passportExpiresOn"
      ]);

      if (valid) {
        setStepIndex(2);
      }

      return;
    }

    if (steps[stepIndex] === "residency") {
      const valid = await trigger([
        "residencyCountryCode",
        "residencyCity",
        "residencyAddressLine1",
        "residencyAddressLine2",
        "residencyStatus",
        "companions"
      ]);

      if (valid) {
        setStepIndex(3);
      }

      return;
    }

    if (steps[stepIndex] === "documents") {
      if (missingRequiredDocuments.length > 0) {
        toast.error(t("documentsMissingTitle"), {
          description: t("documentsMissingDescription")
        });
        return;
      }

      setStepIndex(4);
    }
  }

  const documentCompletion = `${requiredDocumentCodes.length - missingRequiredDocuments.length}/${requiredDocumentCodes.length}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileCheck2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("eyebrow")}
              </p>
              <CardTitle className="font-display text-3xl tracking-[0.01em]">
                {t("title")}
              </CardTitle>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span
                key={step}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  index === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : index < stepIndex
                      ? "bg-secondary text-secondary-foreground"
                      : "border border-border/80 bg-background text-muted-foreground"
                }`}
              >
                {t(`steps.${step}`)}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-8"
            onSubmit={handleSubmit((formData) => submitMutation.mutate(formData))}
            noValidate
          >
            {steps[stepIndex] === "travel" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("travelTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("travelBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-destination-country-code">{t("destinationLabel")}</Label>
                    <select
                      id="visa-destination-country-code"
                      className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-invalid={errors.destinationCountryCode ? "true" : "false"}
                      aria-describedby={
                        errors.destinationCountryCode
                          ? "visa-destination-country-code-error"
                          : undefined
                      }
                      {...register("destinationCountryCode")}
                    >
                      {VISA_COUNTRY_OPTIONS.filter((option) =>
                        product.countryCode === option.code
                      ).map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <FormFieldError
                      id="visa-destination-country-code-error"
                      message={errors.destinationCountryCode?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visa-nationality-country-code">{t("nationalityLabel")}</Label>
                    <select
                      id="visa-nationality-country-code"
                      className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-invalid={errors.nationalityCountryCode ? "true" : "false"}
                      aria-describedby={
                        errors.nationalityCountryCode
                          ? "visa-nationality-country-code-error"
                          : undefined
                      }
                      {...register("nationalityCountryCode")}
                    >
                      <option value="">{t("chooseCountry")}</option>
                      {VISA_COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <FormFieldError
                      id="visa-nationality-country-code-error"
                      message={errors.nationalityCountryCode?.message}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-arrival-date">{t("arrivalDateLabel")}</Label>
                    <Input
                      id="visa-arrival-date"
                      type="date"
                      aria-invalid={errors.intendedArrivalDate ? "true" : "false"}
                      aria-describedby={
                        errors.intendedArrivalDate ? "visa-arrival-date-error" : undefined
                      }
                      {...register("intendedArrivalDate")}
                    />
                    <FormFieldError
                      id="visa-arrival-date-error"
                      message={errors.intendedArrivalDate?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-departure-date">{t("departureDateLabel")}</Label>
                    <Input
                      id="visa-departure-date"
                      type="date"
                      aria-invalid={errors.intendedDepartureDate ? "true" : "false"}
                      aria-describedby={
                        errors.intendedDepartureDate ? "visa-departure-date-error" : undefined
                      }
                      {...register("intendedDepartureDate")}
                    />
                    <FormFieldError
                      id="visa-departure-date-error"
                      message={errors.intendedDepartureDate?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-purpose">{t("purposeLabel")}</Label>
                  <select
                    id="visa-purpose"
                    className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...register("purposeOfTravel")}
                  >
                    {VISA_PURPOSES.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {t(`purposeOptions.${purpose}`)}
                      </option>
                    ))}
                  </select>
                  <FormFieldError id="visa-purpose-error" message={errors.purposeOfTravel?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-purpose-details">{t("purposeDetailsLabel")}</Label>
                  <Textarea
                    id="visa-purpose-details"
                    placeholder={t("purposeDetailsPlaceholder")}
                    {...register("purposeOfTravelDetails")}
                  />
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "identity" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("identityTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("identityBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-first-name">{t("firstNameLabel")}</Label>
                    <Input id="visa-first-name" {...register("firstName")} />
                    <FormFieldError id="visa-first-name-error" message={errors.firstName?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-last-name">{t("lastNameLabel")}</Label>
                    <Input id="visa-last-name" {...register("lastName")} />
                    <FormFieldError id="visa-last-name-error" message={errors.lastName?.message} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-date-of-birth">{t("dateOfBirthLabel")}</Label>
                    <Input id="visa-date-of-birth" type="date" {...register("dateOfBirth")} />
                    <FormFieldError
                      id="visa-date-of-birth-error"
                      message={errors.dateOfBirth?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-email">{t("emailLabel")}</Label>
                    <Input id="visa-email" type="email" autoComplete="email" {...register("email")} />
                    <FormFieldError id="visa-email-error" message={errors.email?.message} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-phone">{t("phoneLabel")}</Label>
                  <Input
                    id="visa-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={t("phonePlaceholder")}
                    {...register("phone")}
                  />
                  <FormFieldError id="visa-phone-error" message={errors.phone?.message} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-passport-number">{t("passportNumberLabel")}</Label>
                    <Input id="visa-passport-number" {...register("passportNumber")} />
                    <FormFieldError
                      id="visa-passport-number-error"
                      message={errors.passportNumber?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-passport-country">{t("passportCountryLabel")}</Label>
                    <select
                      id="visa-passport-country"
                      className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register("passportCountryCode")}
                    >
                      <option value="">{t("chooseCountry")}</option>
                      {VISA_COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <FormFieldError
                      id="visa-passport-country-error"
                      message={errors.passportCountryCode?.message}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-passport-issued">{t("passportIssuedLabel")}</Label>
                    <Input id="visa-passport-issued" type="date" {...register("passportIssuedOn")} />
                    <FormFieldError
                      id="visa-passport-issued-error"
                      message={errors.passportIssuedOn?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-passport-expiry">{t("passportExpiryLabel")}</Label>
                    <Input id="visa-passport-expiry" type="date" {...register("passportExpiresOn")} />
                    <FormFieldError
                      id="visa-passport-expiry-error"
                      message={errors.passportExpiresOn?.message}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "residency" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("residencyTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("residencyBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visa-residency-country">{t("residencyCountryLabel")}</Label>
                    <select
                      id="visa-residency-country"
                      className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register("residencyCountryCode")}
                    >
                      <option value="">{t("chooseCountry")}</option>
                      {VISA_COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <FormFieldError
                      id="visa-residency-country-error"
                      message={errors.residencyCountryCode?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa-residency-status">{t("residencyStatusLabel")}</Label>
                    <select
                      id="visa-residency-status"
                      className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register("residencyStatus")}
                    >
                      {VISA_RESIDENCY_STATUSES.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {t(`residencyStatusOptions.${statusOption}`)}
                        </option>
                      ))}
                    </select>
                    <FormFieldError
                      id="visa-residency-status-error"
                      message={errors.residencyStatus?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-residency-city">{t("residencyCityLabel")}</Label>
                  <Input id="visa-residency-city" {...register("residencyCity")} />
                  <FormFieldError
                    id="visa-residency-city-error"
                    message={errors.residencyCity?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-residency-address-line-1">{t("residencyAddress1Label")}</Label>
                  <Input id="visa-residency-address-line-1" {...register("residencyAddressLine1")} />
                  <FormFieldError
                    id="visa-residency-address-line-1-error"
                    message={errors.residencyAddressLine1?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa-residency-address-line-2">{t("residencyAddress2Label")}</Label>
                  <Input id="visa-residency-address-line-2" {...register("residencyAddressLine2")} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl">{t("companionsTitle")}</h3>
                      <p className="text-sm leading-7 text-muted-foreground">{t("companionsBody")}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg px-5"
                      onClick={() =>
                        companionsFieldArray.append({
                          dateOfBirth: "",
                          fullName: "",
                          passportNumber: "",
                          relationship: ""
                        })
                      }
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      {t("addCompanionAction")}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {companionsFieldArray.fields.length > 0 ? (
                      companionsFieldArray.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="rounded-lg border border-border/80 bg-background/70 p-5"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {t("companionCardLabel", {count: index + 1})}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => companionsFieldArray.remove(index)}
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                              {t("removeAction")}
                            </Button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`visa-companion-name-${index}`}>{t("companionNameLabel")}</Label>
                              <Input id={`visa-companion-name-${index}`} {...register(`companions.${index}.fullName`)} />
                              <FormFieldError
                                id={`visa-companion-name-error-${index}`}
                                message={errors.companions?.[index]?.fullName?.message}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`visa-companion-relationship-${index}`}>{t("companionRelationshipLabel")}</Label>
                              <Input id={`visa-companion-relationship-${index}`} {...register(`companions.${index}.relationship`)} />
                              <FormFieldError
                                id={`visa-companion-relationship-error-${index}`}
                                message={errors.companions?.[index]?.relationship?.message}
                              />
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`visa-companion-dob-${index}`}>{t("companionDateOfBirthLabel")}</Label>
                              <Input id={`visa-companion-dob-${index}`} type="date" {...register(`companions.${index}.dateOfBirth`)} />
                              <FormFieldError
                                id={`visa-companion-dob-error-${index}`}
                                message={errors.companions?.[index]?.dateOfBirth?.message}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`visa-companion-passport-${index}`}>{t("companionPassportLabel")}</Label>
                              <Input id={`visa-companion-passport-${index}`} {...register(`companions.${index}.passportNumber`)} />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("companionsEmpty")}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "documents" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("documentsTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("documentsBody")}</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-background/70 p-5 text-sm leading-7 text-muted-foreground">
                  {t("privacyCopy")}
                </div>

                <div className="grid gap-4">
                  {[...product.requirementCodes, ...product.optionalRequirementCodes].map(
                    (documentType) => {
                      const definition = VISA_REQUIREMENT_DEFINITIONS[documentType];

                      return (
                        <VisaDocumentUploadField
                          key={documentType}
                          accept={definition.acceptedMimeTypes.join(",")}
                          applicationId={applicationId}
                          description={sharedT(`documentDescriptions.${documentType}`)}
                          documentType={documentType}
                          existingUploads={uploadsByType.get(documentType) ?? []}
                          isRequired={product.requirementCodes.includes(documentType)}
                          label={sharedT(`documentLabels.${documentType}`)}
                          locale={locale}
                          onUploadComplete={(upload) =>
                            setUploadedDocuments((currentUploads) => [...currentUploads, upload])
                          }
                        />
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "review" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("reviewTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("reviewBody")}</p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewApplicantLabel")}
                    </p>
                    <p className="mt-3 text-sm font-medium text-foreground">
                      {values.firstName} {values.lastName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getCountryLabel(values.nationalityCountryCode)} | {values.email}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewTravelLabel")}
                    </p>
                    <p className="mt-3 text-sm text-foreground">
                      {getCountryLabel(values.destinationCountryCode)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {values.intendedArrivalDate} | {values.intendedDepartureDate}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`purposeOptions.${values.purposeOfTravel}`)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewDocumentsLabel")}
                    </p>
                    <p className="mt-3 text-sm text-foreground">
                      {t("documentCompletionValue", {count: documentCompletion})}
                    </p>
                    {missingRequiredDocuments.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-destructive">
                        {missingRequiredDocuments.map((documentType) => (
                          <li key={documentType}>
                            {sharedT(`documentLabels.${documentType}`)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground">
                        <CircleCheckBig aria-hidden="true" className="h-4 w-4 text-primary" />
                        {t("documentsReady")}
                      </p>
                    )}
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      {...register("acknowledgeServiceScope")}
                    />
                    <span>
                      <span className="block font-medium text-foreground">{t("serviceScopeLabel")}</span>
                      <span className="mt-1 block leading-7 text-muted-foreground">
                        {t("serviceScopeBody")}
                      </span>
                    </span>
                  </label>
                  <FormFieldError
                    id="visa-service-scope-error"
                    message={errors.acknowledgeServiceScope?.message}
                  />

                  <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      {...register("acknowledgeInformationAccuracy")}
                    />
                    <span>
                      <span className="block font-medium text-foreground">{t("accuracyLabel")}</span>
                      <span className="mt-1 block leading-7 text-muted-foreground">
                        {t("accuracyBody")}
                      </span>
                    </span>
                  </label>
                  <FormFieldError
                    id="visa-accuracy-error"
                    message={errors.acknowledgeInformationAccuracy?.message}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg px-6"
                  disabled={stepIndex === 0 || saveMutation.isPending || submitMutation.isPending}
                  onClick={() => setStepIndex((currentStep) => Math.max(0, currentStep - 1))}
                >
                  {t("backAction")}
                </Button>

                {steps[stepIndex] === "review" ? (
                  <Button
                    type="submit"
                    className="rounded-lg px-6"
                    disabled={
                      submitMutation.isPending ||
                      missingRequiredDocuments.length > 0
                    }
                  >
                    {submitMutation.isPending ? t("submitting") : t("submitAction")}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="rounded-lg px-6"
                    onClick={handleContinue}
                  >
                    {t("continueAction")}
                  </Button>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg px-5"
                  disabled={saveMutation.isPending || submitMutation.isPending}
                  onClick={() => saveMutation.mutate(getValues())}
                >
                  {saveMutation.isPending ? (
                    t("saving")
                  ) : (
                    <>
                      <Save aria-hidden="true" className="h-4 w-4" />
                      {t("saveDraftAction")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <VisaStatusTracker
          locale={locale}
          reviewedAt={initialReviewedAt}
          status={status}
          submittedAt={initialSubmittedAt}
          updatedAt={savedAt}
        />

        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("serviceLabel")}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {sharedT(`productTitles.${product.slug}`)}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("priceLabel")}
              </p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {formatVisaServicePrice(product, locale)}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("timelineLabel")}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {sharedT("processingTimelineValue", {
                  range: formatVisaProcessingTimeline(
                    product.processingTimeline.processingDaysMin,
                    product.processingTimeline.processingDaysMax
                  )
                })}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("documentsLabel")}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {t("documentCompletionValue", {count: documentCompletion})}
              </p>
              <p className="mt-2 text-muted-foreground">{t("notLegalAdviceCopy")}</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("lastSavedLabel")}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {formatDateTime(savedAt, locale)}
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
