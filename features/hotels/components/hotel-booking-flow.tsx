"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {CircleCheckBig, Hotel, ShieldCheck} from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {type Locale} from "@/lib/i18n/routing";

import {createHotelBookingSchema} from "../lib/schemas";
import {formatHotelPrice, formatHotelStayDates} from "../lib/formatters";
import {type HotelBookingConfirmation, type HotelBookingFormValues, type HotelGuestType, type HotelRoomOption, type NormalizedHotelOffer} from "../types";

type HotelBookingFlowProps = {
  defaultContactEmail: string;
  locale: Locale;
  offer: NormalizedHotelOffer;
  searchLogId?: string;
  selectedRoom: HotelRoomOption;
};

type HotelBookingRoutePayload = HotelBookingFormValues & {
  locale: Locale;
  offerId: string;
  searchLogId?: string;
};

const steps = ["guests", "contact", "review"] as const;

async function createHotelBooking(
  payload: HotelBookingRoutePayload
): Promise<HotelBookingConfirmation> {
  const response = await fetch("/api/hotels/bookings", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = (await response.json()) as
    | {message?: string}
    | HotelBookingConfirmation;

  if (!response.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : "Unable to create the pending stay booking."
    );
  }

  return body as HotelBookingConfirmation;
}

export function HotelBookingFlow({
  defaultContactEmail,
  locale,
  offer,
  searchLogId,
  selectedRoom
}: HotelBookingFlowProps) {
  const t = useTranslations("Hotels.booking");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const schema = createHotelBookingSchema(offer.guestCount, {
    contactEmailInvalid: t("validation.contactEmailInvalid"),
    contactEmailRequired: t("validation.contactEmailRequired"),
    contactPhoneInvalid: t("validation.contactPhoneInvalid"),
    guestCountMismatch: t("validation.guestCountMismatch"),
    guestFirstNameRequired: t("validation.guestFirstNameRequired"),
    guestLastNameRequired: t("validation.guestLastNameRequired"),
    specialRequestsTooLong: t("validation.specialRequestsTooLong")
  });
  const {
    formState: {errors},
    getValues,
    handleSubmit,
    register,
    trigger,
    watch
  } = useForm<HotelBookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: defaultContactEmail,
      contactPhone: "",
      guests: Array.from({length: offer.guestCount}, (_, index) => ({
        firstName: "",
        guestType: (index === 0 ? "adult" : "adult") as HotelGuestType,
        lastName: ""
      })),
      specialRequests: ""
    }
  });
  const mutation = useMutation({
    mutationFn: (values: HotelBookingFormValues) =>
      createHotelBooking({
        ...values,
        locale,
        offerId: selectedRoom.offerId,
        searchLogId
      }),
    onError: (error) => {
      toast.error(t("errorTitle"), {
        description: error.message
      });
    },
    onSuccess: (confirmation) => {
      toast.success(t("successTitle"), {
        description: t("successDescription", {
          reference: confirmation.bookingReference
        })
      });
      router.push(`/${locale}/hotels/bookings/${confirmation.bookingId}`);
    }
  });
  const values = watch();

  async function handleContinue() {
    if (steps[stepIndex] === "guests") {
      const valid = await trigger("guests");

      if (valid) {
        setStepIndex(1);
      }

      return;
    }

    if (steps[stepIndex] === "contact") {
      const valid = await trigger(["contactEmail", "contactPhone", "specialRequests"]);

      if (valid) {
        setStepIndex(2);
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel aria-hidden="true" className="h-5 w-5" />
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
          <form className="space-y-8" onSubmit={handleSubmit((submittedValues) => mutation.mutate(submittedValues))} noValidate>
            {steps[stepIndex] === "guests" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("guestsTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {t("guestsBody", {count: offer.guestCount})}
                  </p>
                </div>

                <div className="grid gap-4">
                  {values.guests.map((guest, index) => (
                    <div
                      key={`${guest.guestType}-${index}`}
                      className="rounded-lg border border-border/80 bg-background/70 p-5"
                    >
                      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t("guestCardLabel", {count: index + 1})}
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`guest-first-name-${index}`}>
                            {t("firstNameLabel")}
                          </Label>
                          <Input
                            id={`guest-first-name-${index}`}
                            aria-invalid={errors.guests?.[index]?.firstName ? "true" : "false"}
                            aria-describedby={
                              errors.guests?.[index]?.firstName
                                ? `guest-first-name-error-${index}`
                                : undefined
                            }
                            {...register(`guests.${index}.firstName`)}
                          />
                          <FormFieldError
                            id={`guest-first-name-error-${index}`}
                            message={errors.guests?.[index]?.firstName?.message}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`guest-last-name-${index}`}>
                            {t("lastNameLabel")}
                          </Label>
                          <Input
                            id={`guest-last-name-${index}`}
                            aria-invalid={errors.guests?.[index]?.lastName ? "true" : "false"}
                            aria-describedby={
                              errors.guests?.[index]?.lastName
                                ? `guest-last-name-error-${index}`
                                : undefined
                            }
                            {...register(`guests.${index}.lastName`)}
                          />
                          <FormFieldError
                            id={`guest-last-name-error-${index}`}
                            message={errors.guests?.[index]?.lastName?.message}
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`guest-type-${index}`}>{t("guestTypeLabel")}</Label>
                        <select
                          id={`guest-type-${index}`}
                          className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...register(`guests.${index}.guestType`)}
                        >
                          <option value="adult">{t("guestTypeOptions.adult")}</option>
                          <option value="child">{t("guestTypeOptions.child")}</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "contact" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("contactTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {t("contactBody")}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hotel-contact-email">{t("contactEmailLabel")}</Label>
                    <Input
                      id="hotel-contact-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.contactEmail ? "true" : "false"}
                      aria-describedby={
                        errors.contactEmail ? "hotel-contact-email-error" : undefined
                      }
                      {...register("contactEmail")}
                    />
                    <FormFieldError
                      id="hotel-contact-email-error"
                      message={errors.contactEmail?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotel-contact-phone">{t("contactPhoneLabel")}</Label>
                    <Input
                      id="hotel-contact-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder={t("contactPhonePlaceholder")}
                      aria-invalid={errors.contactPhone ? "true" : "false"}
                      aria-describedby={
                        errors.contactPhone ? "hotel-contact-phone-error" : undefined
                      }
                      {...register("contactPhone")}
                    />
                    <FormFieldError
                      id="hotel-contact-phone-error"
                      message={errors.contactPhone?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hotel-special-requests">{t("specialRequestsLabel")}</Label>
                  <Textarea
                    id="hotel-special-requests"
                    placeholder={t("specialRequestsPlaceholder")}
                    aria-invalid={errors.specialRequests ? "true" : "false"}
                    aria-describedby={
                      errors.specialRequests ? "hotel-special-requests-error" : undefined
                    }
                    {...register("specialRequests")}
                  />
                  <FormFieldError
                    id="hotel-special-requests-error"
                    message={errors.specialRequests?.message}
                  />
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "review" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("reviewTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {t("reviewBody")}
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewGuestsLabel")}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                      {getValues("guests").map((guest, index) => (
                        <li key={`${guest.firstName}-${index}`} className="flex items-center gap-2">
                          <CircleCheckBig aria-hidden="true" className="h-4 w-4 text-primary" />
                          {guest.firstName} {guest.lastName} · {t(`guestTypeOptions.${guest.guestType}`)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewContactLabel")}
                    </p>
                    <p className="mt-3 text-sm text-foreground">{getValues("contactEmail")}</p>
                    {getValues("contactPhone") ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getValues("contactPhone")}
                      </p>
                    ) : null}
                    {getValues("specialRequests") ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {getValues("specialRequests")}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewTaxLabel")}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <div className="flex items-center justify-between">
                        <span>{t("subtotalLabel")}</span>
                        <span>{formatHotelPrice({totalAmount: selectedRoom.subtotalAmount}, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("taxesLabel")}</span>
                        <span>{formatHotelPrice({totalAmount: selectedRoom.taxAmount}, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/70 pt-2 font-semibold">
                        <span>{t("totalLabel")}</span>
                        <span>{formatHotelPrice(selectedRoom, locale)}</span>
                      </div>
                      <p className="text-xs leading-6 text-muted-foreground">
                        {t("vatNotice")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-6"
                disabled={stepIndex === 0 || mutation.isPending}
                onClick={() => setStepIndex((currentStep) => Math.max(0, currentStep - 1))}
              >
                {t("backAction")}
              </Button>

              {steps[stepIndex] === "review" ? (
                <Button type="submit" className="rounded-lg px-6" disabled={mutation.isPending}>
                  {mutation.isPending ? t("submitting") : t("submitAction")}
                </Button>
              ) : (
                <Button type="button" className="rounded-lg px-6" onClick={handleContinue}>
                  {t("continueAction")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border/80 bg-background/70">
              <Image
                src={offer.images[0]}
                alt={offer.propertyName}
                className="h-48 w-full object-cover"
                height={192}
                sizes="(min-width: 1024px) 30vw, 100vw"
                width={640}
              />
              <div className="space-y-3 p-5">
                <div>
                  <h3 className="font-display text-2xl">{offer.propertyName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {offer.neighborhood}, {offer.cityName}
                  </p>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("roomLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {selectedRoom.roomName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("stayLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatHotelStayDates(offer.checkIn, offer.checkOut, locale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("guestsLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {offer.guestCount} · {offer.roomCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("boardLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {t(`rateTypeOptions.${selectedRoom.rateType}`)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <dt className="font-semibold text-foreground">{t("totalLabel")}</dt>
                    <dd className="font-display text-3xl text-foreground">
                      {formatHotelPrice(selectedRoom, locale)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-5 text-sm leading-7 text-muted-foreground">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {selectedRoom.cancellationSummary}
              </p>
              <p className="mt-3">{offer.policies.cancellation}</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
