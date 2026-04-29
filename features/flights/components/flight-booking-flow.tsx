"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {formatMoney} from "@/lib/money";

import {createFlightBookingSchema} from "../lib/schemas";
import {formatFlightDuration} from "../lib/formatters";
import {
  type FlightBookingConfirmation,
  type FlightBookingPayload,
  type FlightTravelerFormValue,
  type NormalizedFlightOffer
} from "../types";

type FlightBookingFlowProps = {
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  locale: "en" | "de";
  offer: NormalizedFlightOffer;
  searchLogId?: string;
};

function buildTravelerDefaults(offer: NormalizedFlightOffer): FlightTravelerFormValue[] {
  return [
    ...Array.from({length: offer.passengerCounts.adults}, () => ({
      firstName: "",
      lastName: "",
      travelerType: "adult" as const
    })),
    ...Array.from({length: offer.passengerCounts.children}, () => ({
      firstName: "",
      lastName: "",
      travelerType: "child" as const
    })),
    ...Array.from({length: offer.passengerCounts.infants}, () => ({
      firstName: "",
      lastName: "",
      travelerType: "infant" as const
    }))
  ];
}

async function createFlightBooking(
  payload: FlightBookingPayload & {locale: "en" | "de"}
) {
  const response = await fetch("/api/flights/bookings", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | {message?: string}
      | null;

    throw new Error(errorPayload?.message ?? "Unable to create the flight booking.");
  }

  return (await response.json()) as FlightBookingConfirmation;
}

export function FlightBookingFlow({
  defaultEmail,
  defaultPhone,
  locale,
  offer,
  searchLogId
}: FlightBookingFlowProps) {
  const t = useTranslations("Flights.booking");
  const router = useRouter();
  const [step, setStep] = useState<"details" | "review">("details");
  const travelerDefaults = buildTravelerDefaults(offer);
  const schema = createFlightBookingSchema(travelerDefaults.length, {
    contactEmailInvalid: t("validation.contactEmailInvalid"),
    contactEmailRequired: t("validation.contactEmailRequired"),
    contactPhoneInvalid: t("validation.contactPhoneInvalid"),
    dateOfBirthInvalid: t("validation.dateOfBirthInvalid"),
    firstNameRequired: t("validation.firstNameRequired"),
    lastNameRequired: t("validation.lastNameRequired"),
    specialRequestsTooLong: t("validation.specialRequestsTooLong")
  });
  const {
    formState: {errors},
    getValues,
    handleSubmit,
    register,
    trigger,
    watch
  } = useForm<FlightBookingPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: defaultEmail ?? "",
      contactPhone: defaultPhone ?? "",
      offerId: offer.id,
      saveTravelerProfiles: true,
      searchLogId,
      specialRequests: "",
      travelers: travelerDefaults
    }
  });
  const bookingMutation = useMutation({
    mutationFn: (payload: FlightBookingPayload) =>
      createFlightBooking({
        ...payload,
        locale
      }),
    onError: (error) => {
      toast.error(t("submitErrorTitle"), {
        description: error instanceof Error ? error.message : t("submitErrorBody")
      });
    },
    onSuccess: (result) => {
      toast.success(t("submitSuccessTitle"), {
        description: t("submitSuccessDescription", {
          reference: result.bookingReference
        })
      });
      router.push(`/${locale}/flights/bookings/${result.bookingId}`);
    }
  });
  const values = watch();

  async function moveToReview() {
    const isValid = await trigger();

    if (isValid) {
      setStep("review");
    }
  }

  const travelerTypeLabels: Record<FlightTravelerFormValue["travelerType"], string> = {
    adult: t("travelerTypeLabels.adult"),
    child: t("travelerTypeLabels.child"),
    infant: t("travelerTypeLabels.infant")
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-5 rounded-lg border border-border/80 bg-card/92 p-5 shadow-soft lg:p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {step === "details" ? t("detailsEyebrow") : t("reviewEyebrow")}
          </p>
          <h1 className="font-display text-4xl text-foreground">
            {step === "details" ? t("detailsTitle") : t("reviewTitle")}
          </h1>
          <p className="leading-7 text-muted-foreground">
            {step === "details" ? t("detailsLead") : t("reviewLead")}
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={handleSubmit((payload) => bookingMutation.mutate(payload))}
          noValidate
        >
          {step === "details" ? (
            <>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("contactSectionTitle")}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">{t("contactEmailLabel")}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.contactEmail ? "true" : "false"}
                      aria-describedby={errors.contactEmail ? "contact-email-error" : undefined}
                      {...register("contactEmail")}
                    />
                    <FormFieldError
                      id="contact-email-error"
                      message={errors.contactEmail?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">{t("contactPhoneLabel")}</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      autoComplete="tel"
                      aria-invalid={errors.contactPhone ? "true" : "false"}
                      aria-describedby={errors.contactPhone ? "contact-phone-error" : undefined}
                      {...register("contactPhone")}
                    />
                    <FormFieldError
                      id="contact-phone-error"
                      message={errors.contactPhone?.message}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("travelersSectionTitle")}
                </h2>
                <div className="grid gap-4">
                  {values.travelers.map((traveler, index) => (
                    <div
                      key={`${traveler.travelerType}-${index}`}
                      className="rounded-lg border border-border/80 bg-background/70 p-4"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        {travelerTypeLabels[traveler.travelerType]} {index + 1}
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`traveler-first-name-${index}`}>
                            {t("firstNameLabel")}
                          </Label>
                          <Input
                            id={`traveler-first-name-${index}`}
                            aria-invalid={errors.travelers?.[index]?.firstName ? "true" : "false"}
                            aria-describedby={
                              errors.travelers?.[index]?.firstName
                                ? `traveler-first-name-${index}-error`
                                : undefined
                            }
                            {...register(`travelers.${index}.firstName`)}
                          />
                          <FormFieldError
                            id={`traveler-first-name-${index}-error`}
                            message={errors.travelers?.[index]?.firstName?.message}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`traveler-last-name-${index}`}>
                            {t("lastNameLabel")}
                          </Label>
                          <Input
                            id={`traveler-last-name-${index}`}
                            aria-invalid={errors.travelers?.[index]?.lastName ? "true" : "false"}
                            aria-describedby={
                              errors.travelers?.[index]?.lastName
                                ? `traveler-last-name-${index}-error`
                                : undefined
                            }
                            {...register(`travelers.${index}.lastName`)}
                          />
                          <FormFieldError
                            id={`traveler-last-name-${index}-error`}
                            message={errors.travelers?.[index]?.lastName?.message}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`traveler-dob-${index}`}>
                            {t("dateOfBirthLabel")}
                          </Label>
                          <Input
                            id={`traveler-dob-${index}`}
                            type="date"
                            aria-invalid={errors.travelers?.[index]?.dateOfBirth ? "true" : "false"}
                            aria-describedby={
                              errors.travelers?.[index]?.dateOfBirth
                                ? `traveler-dob-${index}-error`
                                : undefined
                            }
                            {...register(`travelers.${index}.dateOfBirth`)}
                          />
                          <FormFieldError
                            id={`traveler-dob-${index}-error`}
                            message={errors.travelers?.[index]?.dateOfBirth?.message}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("preferencesSectionTitle")}
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="special-requests">{t("specialRequestsLabel")}</Label>
                  <Textarea
                    id="special-requests"
                    placeholder={t("specialRequestsPlaceholder")}
                    aria-invalid={errors.specialRequests ? "true" : "false"}
                    aria-describedby={
                      errors.specialRequests ? "special-requests-error" : undefined
                    }
                    {...register("specialRequests")}
                  />
                  <FormFieldError
                    id="special-requests-error"
                    message={errors.specialRequests?.message}
                  />
                </div>
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <input type="checkbox" {...register("saveTravelerProfiles")} />
                  <span>{t("saveTravelerProfilesLabel")}</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" className="rounded-lg px-6" onClick={moveToReview}>
                  {t("continueToReviewAction")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("reviewContactTitle")}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {getValues("contactEmail")}
                  {getValues("contactPhone") ? ` · ${getValues("contactPhone")}` : ""}
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("reviewTravelersTitle")}
                </h2>
                <div className="grid gap-3">
                  {getValues("travelers").map((traveler, index) => (
                    <div key={`${traveler.travelerType}-${index}`} className="text-sm leading-7 text-muted-foreground">
                      {travelerTypeLabels[traveler.travelerType]} {index + 1}: {traveler.firstName} {traveler.lastName}
                      {traveler.dateOfBirth ? ` · ${traveler.dateOfBirth}` : ""}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border/80 bg-background/70 p-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("reviewNotesTitle")}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {getValues("specialRequests") || t("specialRequestsEmpty")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" className="rounded-lg px-6" onClick={() => setStep("details")}>
                  {t("backToDetailsAction")}
                </Button>
                <Button type="submit" className="rounded-lg px-6" disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? t("submittingAction") : t("confirmBookingAction")}
                </Button>
              </div>
            </>
          )}
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border/80 bg-card/92 p-5 shadow-soft lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t("summaryEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground">
            {offer.originAirportCode} to {offer.destinationAirportCode}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {offer.airlineNames.join(", ")} · {t(`cabinBadges.${offer.cabinClass}`)} · {formatFlightDuration(offer.totalDurationMinutes)}
          </p>
          <div className="mt-5 space-y-3 rounded-lg bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("totalLabel")}</span>
              <span className="font-semibold text-foreground">
                {formatMoney(offer.totalAmount, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("fareConditionsLabel")}</span>
              <span className="font-medium text-foreground">
                {offer.refundable ? t("refundable") : t("nonRefundable")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("baggageLabel")}</span>
              <span className="font-medium text-foreground">{offer.baggageSummary.checked}</span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {t("pendingPaymentNotice")}
          </p>
        </div>
      </aside>
    </div>
  );
}
