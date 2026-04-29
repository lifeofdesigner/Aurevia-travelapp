"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {CircleCheckBig, Compass, ShieldCheck} from "lucide-react";
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
import {formatMoney} from "@/lib/money";
import {cn} from "@/lib/utils";

import {
  formatTourDateTime,
  formatTourDuration,
  getTourSlotLabel
} from "../lib/formatters";
import {buildTourBookingQuote} from "../lib/pricing";
import {createTourBookingSchema, getDefaultTourSlotId} from "../lib/schemas";
import {
  type NormalizedTourOffer,
  type TourBookingConfirmation,
  type TourBookingFormValues
} from "../types";

type TourBookingFlowProps = {
  defaultContactEmail: string;
  locale: Locale;
  offer: NormalizedTourOffer;
  searchLogId?: string;
  selectedSlotId?: string;
};

type TourBookingRoutePayload = TourBookingFormValues & {
  locale: Locale;
  offerId: string;
  searchLogId?: string;
};

const steps = ["participants", "contact", "review"] as const;

async function createTourBooking(
  payload: TourBookingRoutePayload
): Promise<TourBookingConfirmation> {
  const response = await fetch("/api/tours/bookings", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = (await response.json()) as {message?: string} | TourBookingConfirmation;

  if (!response.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : "Unable to create the pending activity booking."
    );
  }

  return body as TourBookingConfirmation;
}

export function TourBookingFlow({
  defaultContactEmail,
  locale,
  offer,
  searchLogId,
  selectedSlotId
}: TourBookingFlowProps) {
  const t = useTranslations("Tours.booking");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const initialSlotId =
    offer.availabilitySlots.find((slot) => slot.slotId === selectedSlotId)?.slotId ??
    getDefaultTourSlotId(offer);
  const schema = createTourBookingSchema(offer, {
    contactEmailInvalid: t("validation.contactEmailInvalid"),
    contactEmailRequired: t("validation.contactEmailRequired"),
    contactPhoneInvalid: t("validation.contactPhoneInvalid"),
    leadTravelerFirstNameRequired: t("validation.leadTravelerFirstNameRequired"),
    leadTravelerLastNameRequired: t("validation.leadTravelerLastNameRequired"),
    participantRange: t("validation.participantRange"),
    slotRequired: t("validation.slotRequired"),
    slotUnavailable: t("validation.slotUnavailable"),
    specialRequestsTooLong: t("validation.specialRequestsTooLong")
  });
  const {
    formState: {errors},
    getValues,
    handleSubmit,
    register,
    trigger,
    watch
  } = useForm<TourBookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adults: 2,
      children: 0,
      contactEmail: defaultContactEmail,
      contactPhone: "",
      leadTravelerFirstName: "",
      leadTravelerLastName: "",
      selectedAddOnCodes: [],
      slotId: initialSlotId,
      specialRequests: ""
    }
  });
  const watchedValues = watch();
  let quoteResult:
    | {
        error?: string;
        quote: ReturnType<typeof buildTourBookingQuote>;
      }
    | {
        error: string;
        quote?: undefined;
      };

  try {
    quoteResult = {
      error: undefined,
      quote: buildTourBookingQuote(offer, {
        adults: Number(watchedValues.adults ?? 0),
        children: Number(watchedValues.children ?? 0),
        selectedAddOnCodes: watchedValues.selectedAddOnCodes ?? [],
        slotId: watchedValues.slotId ?? ""
      })
    };
  } catch (error) {
    quoteResult = {
      error: error instanceof Error ? error.message : t("validation.slotUnavailable"),
      quote: undefined
    };
  }
  const mutation = useMutation({
    mutationFn: (values: TourBookingFormValues) =>
      createTourBooking({
        ...values,
        locale,
        offerId: offer.id,
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
      router.push(`/${locale}/tours/bookings/${confirmation.bookingId}`);
    }
  });

  async function handleContinue() {
    if (steps[stepIndex] === "participants") {
      const valid = await trigger([
        "slotId",
        "adults",
        "children",
        "leadTravelerFirstName",
        "leadTravelerLastName",
        "selectedAddOnCodes"
      ]);

      if (valid && quoteResult.quote) {
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

  const quote = quoteResult.quote;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass aria-hidden="true" className="h-5 w-5" />
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
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold",
                  index === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : index < stepIndex
                      ? "bg-secondary text-secondary-foreground"
                      : "border border-border/80 bg-background text-muted-foreground"
                )}
              >
                {t(`steps.${step}`)}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-8"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            {steps[stepIndex] === "participants" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("participantsTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {t("participantsBody")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tour-slot">{t("slotLabel")}</Label>
                  <select
                    id="tour-slot"
                    className="h-11 w-full rounded-lg border border-border/80 bg-background px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-invalid={errors.slotId ? "true" : "false"}
                    aria-describedby={errors.slotId ? "tour-slot-error" : undefined}
                    {...register("slotId")}
                  >
                    {offer.availabilitySlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId} disabled={slot.soldOut}>
                        {slot.soldOut
                          ? `${getTourSlotLabel(slot, locale)} - ${t("soldOut")}`
                          : getTourSlotLabel(slot, locale)}
                      </option>
                    ))}
                  </select>
                  <FormFieldError id="tour-slot-error" message={errors.slotId?.message} />
                  {quoteResult.error ? (
                    <p className="text-sm text-destructive">{quoteResult.error}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tour-adults">{t("adultsLabel")}</Label>
                    <Input
                      id="tour-adults"
                      type="number"
                      min={1}
                      max={12}
                      aria-invalid={errors.adults ? "true" : "false"}
                      aria-describedby={errors.adults ? "tour-adults-error" : undefined}
                      {...register("adults", {valueAsNumber: true})}
                    />
                    <FormFieldError id="tour-adults-error" message={errors.adults?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tour-children">{t("childrenLabel")}</Label>
                    <Input
                      id="tour-children"
                      type="number"
                      min={0}
                      max={10}
                      aria-invalid={errors.children ? "true" : "false"}
                      aria-describedby={errors.children ? "tour-children-error" : undefined}
                      {...register("children", {valueAsNumber: true})}
                    />
                    <FormFieldError
                      id="tour-children-error"
                      message={errors.children?.message}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tour-lead-first-name">{t("leadTravelerFirstNameLabel")}</Label>
                    <Input
                      id="tour-lead-first-name"
                      aria-invalid={errors.leadTravelerFirstName ? "true" : "false"}
                      aria-describedby={
                        errors.leadTravelerFirstName
                          ? "tour-lead-first-name-error"
                          : undefined
                      }
                      {...register("leadTravelerFirstName")}
                    />
                    <FormFieldError
                      id="tour-lead-first-name-error"
                      message={errors.leadTravelerFirstName?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tour-lead-last-name">{t("leadTravelerLastNameLabel")}</Label>
                    <Input
                      id="tour-lead-last-name"
                      aria-invalid={errors.leadTravelerLastName ? "true" : "false"}
                      aria-describedby={
                        errors.leadTravelerLastName ? "tour-lead-last-name-error" : undefined
                      }
                      {...register("leadTravelerLastName")}
                    />
                    <FormFieldError
                      id="tour-lead-last-name-error"
                      message={errors.leadTravelerLastName?.message}
                    />
                  </div>
                </div>

                {offer.addOns.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h3 className="font-display text-xl">{t("addOnsTitle")}</h3>
                      <p className="text-sm leading-7 text-muted-foreground">{t("addOnsBody")}</p>
                    </div>
                    <div className="grid gap-3">
                      {offer.addOns.map((addOn) => (
                        <label
                          key={addOn.code}
                          className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-4 text-sm"
                        >
                          <input
                            type="checkbox"
                            value={addOn.code}
                            className="mt-1 h-4 w-4 rounded border-border"
                            {...register("selectedAddOnCodes")}
                          />
                          <span className="flex-1">
                            <span className="block font-medium text-foreground">{addOn.title}</span>
                            <span className="mt-1 block leading-7 text-muted-foreground">
                              {addOn.description}
                            </span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatMoney(addOn.totalAmount, locale)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {steps[stepIndex] === "contact" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("contactTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("contactBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tour-contact-email">{t("contactEmailLabel")}</Label>
                    <Input
                      id="tour-contact-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.contactEmail ? "true" : "false"}
                      aria-describedby={
                        errors.contactEmail ? "tour-contact-email-error" : undefined
                      }
                      {...register("contactEmail")}
                    />
                    <FormFieldError
                      id="tour-contact-email-error"
                      message={errors.contactEmail?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tour-contact-phone">{t("contactPhoneLabel")}</Label>
                    <Input
                      id="tour-contact-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder={t("contactPhonePlaceholder")}
                      aria-invalid={errors.contactPhone ? "true" : "false"}
                      aria-describedby={
                        errors.contactPhone ? "tour-contact-phone-error" : undefined
                      }
                      {...register("contactPhone")}
                    />
                    <FormFieldError
                      id="tour-contact-phone-error"
                      message={errors.contactPhone?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tour-special-requests">{t("specialRequestsLabel")}</Label>
                  <Textarea
                    id="tour-special-requests"
                    placeholder={t("specialRequestsPlaceholder")}
                    aria-invalid={errors.specialRequests ? "true" : "false"}
                    aria-describedby={
                      errors.specialRequests ? "tour-special-requests-error" : undefined
                    }
                    {...register("specialRequests")}
                  />
                  <FormFieldError
                    id="tour-special-requests-error"
                    message={errors.specialRequests?.message}
                  />
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
                      {t("reviewScheduleLabel")}
                    </p>
                    {quote ? (
                      <div className="mt-3 space-y-2 text-sm text-foreground">
                        <p className="inline-flex items-center gap-2">
                          <CircleCheckBig aria-hidden="true" className="h-4 w-4 text-primary" />
                          {quote.selectedSlot.label}
                        </p>
                        <p className="text-muted-foreground">
                          {formatTourDateTime(quote.selectedSlot.startsAt, locale)}
                        </p>
                        <p className="text-muted-foreground">
                          {t("participantCountValue", {count: quote.participantTotal})}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewTravelerLabel")}
                    </p>
                    <p className="mt-3 text-sm text-foreground">
                      {getValues("leadTravelerFirstName")} {getValues("leadTravelerLastName")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("participantMixValue", {
                        adults: getValues("adults"),
                        children: getValues("children")
                      })}
                    </p>
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

                  {quote?.selectedAddOns.length ? (
                    <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t("reviewAddOnsLabel")}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-foreground">
                        {quote.selectedAddOns.map((addOn) => (
                          <li
                            key={addOn.code}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>{addOn.title}</span>
                            <span>{formatMoney(addOn.totalAmount, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewPricingLabel")}
                    </p>
                    {quote ? (
                      <div className="mt-3 space-y-2 text-sm text-foreground">
                        <div className="flex items-center justify-between">
                          <span>{t("subtotalLabel")}</span>
                          <span>{formatMoney(quote.subtotalAmount, locale)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("taxesLabel")}</span>
                          <span>{formatMoney(quote.taxAmount, locale)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/70 pt-2 font-semibold">
                          <span>{t("totalLabel")}</span>
                          <span>{formatMoney(quote.totalAmount, locale)}</span>
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground">{t("vatNotice")}</p>
                      </div>
                    ) : null}
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
                <Button
                  type="submit"
                  className="rounded-lg px-6"
                  disabled={mutation.isPending || !quote}
                >
                  {mutation.isPending ? t("submitting") : t("submitAction")}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-lg px-6"
                  disabled={!quote}
                  onClick={handleContinue}
                >
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
              <div
                aria-hidden="true"
                className="h-48 bg-cover bg-center"
                style={{backgroundImage: `url(${offer.images[0]})`}}
              />
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {t(`categoryOptions.${offer.category}`)}
                  </p>
                  <h3 className="font-display text-2xl">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {offer.cityName}, {offer.countryName}
                  </p>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("summaryDateLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">{offer.serviceDate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("summaryDurationLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatTourDuration(offer.durationMinutes)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("summaryMeetingPointLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {offer.meetingPoint}
                    </dd>
                  </div>
                  {quote ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t("summarySlotLabel")}</dt>
                      <dd className="text-right font-medium text-foreground">
                        {quote.selectedSlot.label}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <dt className="font-semibold text-foreground">{t("totalLabel")}</dt>
                    <dd className="font-display text-3xl text-foreground">
                      {quote
                        ? formatMoney(quote.totalAmount, locale)
                        : formatMoney(offer.priceFromTotalAmount, locale)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-5 text-sm leading-7 text-muted-foreground">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {offer.cancellationPolicy}
              </p>
              <p className="mt-3">{offer.meetingInstructions}</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
